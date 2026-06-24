import { defineStore } from 'pinia'
import { reactive, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import {
  type Theme,
  type ThemeCollection,
  type ChromeTokenKey,
  type GridTokenKey,
  type ConstraintStyleKey,
  type ConstraintStyleOverride,
  THEME_SCHEMA_VERSION,
  loadThemeCollection,
  saveThemeCollection,
  normalizeThemeCollection,
  cloneTheme,
  isBuiltInThemeId,
} from '@/utils/theme'
import { BUILTIN_THEMES, BUILTIN_THEME_LIST, getBuiltInTheme } from '@/utils/themePresets'
import type { UserThemeAttrsInput } from '@/graphql/generated/types'

// The user's saved themes, the active selection, and the custom-styles gate. Local-first
// (localStorage is the immediate source of truth and anonymous fallback), with server sync for
// logged-in users — mirroring stores/colorPalette.ts, but over the normalized user_themes
// backend (CRUD mutations) rather than one JSON blob.
//
// CRUD methods mutate the local collection AND fire the matching server mutation (best-effort);
// the deep watch keeps localStorage in step. The resolver (useConstraintStyles) and the applier
// (useThemeApplier) read `activeTheme` + `enableCustomStyles` from here.
export const useThemeStore = defineStore('theme', () => {
  const collection = reactive<ThemeCollection>(loadThemeCollection())

  // The prefs (active id + gate) we believe the server holds, so we skip redundant pushes.
  let serverPrefsJson: string | null = null

  // ── Reads ──────────────────────────────────────────────────────────────────
  const userThemes = computed(() => collection.userThemes)
  const activeThemeId = computed(() => collection.activeThemeId)
  const enableCustomStyles = computed(() => collection.enableCustomStyles)
  const allThemes = computed<Theme[]>(() => [ ...BUILTIN_THEME_LIST, ...collection.userThemes ])
  const isActiveBuiltIn = computed(() => isBuiltInThemeId(collection.activeThemeId))

  // The effective theme: a built-in, a saved user theme, or Classic as a last resort.
  const activeTheme = computed<Theme>(() =>
    getBuiltInTheme(collection.activeThemeId)
      ?? collection.userThemes.find(t => t.id === collection.activeThemeId)
      ?? BUILTIN_THEMES.classic,
  )

  function findUserTheme(uid: string): Theme | undefined {
    return collection.userThemes.find(t => t.id === uid)
  }

  // ── Server sync (best-effort; the local copy is authoritative for the UI) ────
  function attrsOf(theme: Theme): UserThemeAttrsInput {
    return {
      name: theme.name,
      basePresetId: theme.basePresetId,
      appearance: theme.appearance,
      constraints: theme.constraints,
    }
  }

  function pushNewTheme(theme: Theme) {
    const auth = useAuthStore()
    if (auth.isAuthenticated) auth.createUserTheme(theme.id, attrsOf(theme)).catch(() => {})
  }

  function pushTheme(theme: Theme) {
    const auth = useAuthStore()
    if (auth.isAuthenticated) auth.updateUserTheme(theme.id, attrsOf(theme)).catch(() => {})
  }

  function pushDelete(uid: string) {
    const auth = useAuthStore()
    if (auth.isAuthenticated) auth.deleteUserTheme(uid).catch(() => {})
  }

  function prefsJson(): string {
    return JSON.stringify({ a: collection.activeThemeId, e: collection.enableCustomStyles })
  }

  function pushPrefs(force = false): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return Promise.resolve()
    const json = prefsJson()
    if (!force && json === serverPrefsJson) return Promise.resolve()
    serverPrefsJson = json
    return auth
      .updateThemePreferences({ activeThemeId: collection.activeThemeId, enableCustomStyles: collection.enableCustomStyles })
      .catch(() => { serverPrefsJson = null }) // allow a retry on the next change
  }

  // ── Mutations ────────────────────────────────────────────────────────────────
  function newThemeId(): string {
    return crypto.randomUUID()
  }

  function setActiveTheme(id: string) {
    collection.activeThemeId = id
    void pushPrefs()
  }

  function setEnableCustomStyles(on: boolean) {
    collection.enableCustomStyles = on
    void pushPrefs()
  }

  // Create a new editable theme by cloning a built-in or another user theme (duplicate-then-edit),
  // then make it active. Returns the new theme's id.
  function createThemeFrom(baseId: string, name?: string): string {
    const base = getBuiltInTheme(baseId) ?? findUserTheme(baseId) ?? BUILTIN_THEMES.classic
    const uid = newThemeId()
    const theme = cloneTheme(base, uid, name ?? `${base.name} custom`)
    collection.userThemes.push(theme)
    collection.activeThemeId = uid
    pushNewTheme(theme)
    void pushPrefs()
    return uid
  }

  function duplicateTheme(id: string, name?: string): string | null {
    const source = getBuiltInTheme(id) ?? findUserTheme(id)
    if (!source) return null
    const uid = newThemeId()
    const theme = cloneTheme(source, uid, name ?? `${source.name} copy`)
    collection.userThemes.push(theme)
    collection.activeThemeId = uid
    pushNewTheme(theme)
    void pushPrefs()
    return uid
  }

  function renameTheme(uid: string, name: string) {
    const theme = findUserTheme(uid)
    if (!theme) return
    theme.name = name
    pushTheme(theme)
  }

  function deleteTheme(uid: string) {
    const idx = collection.userThemes.findIndex(t => t.id === uid)
    if (idx === -1) return
    collection.userThemes.splice(idx, 1)
    if (collection.activeThemeId === uid) setActiveTheme('classic')
    pushDelete(uid)
  }

  function updateChromeToken(uid: string, key: ChromeTokenKey, value: string | null) {
    const theme = findUserTheme(uid)
    if (!theme) return
    if (value === null) delete theme.appearance.chrome[key]
    else theme.appearance.chrome[key] = value
    pushTheme(theme)
  }

  function updateGridToken(uid: string, key: GridTokenKey, value: string | null) {
    const theme = findUserTheme(uid)
    if (!theme) return
    if (value === null) delete theme.appearance.grid[key]
    else theme.appearance.grid[key] = value
    pushTheme(theme)
  }

  function updateConstraintOverride(uid: string, key: ConstraintStyleKey, patch: ConstraintStyleOverride) {
    const theme = findUserTheme(uid)
    if (!theme) return
    theme.constraints[key] = { ...theme.constraints[key], ...patch }
    pushTheme(theme)
  }

  function resetConstraintToDefault(uid: string, key: ConstraintStyleKey) {
    const theme = findUserTheme(uid)
    if (!theme) return
    delete theme.constraints[key]
    pushTheme(theme)
  }

  // Empty all overrides back to the base preset (the per-theme "reset to default" escape hatch).
  function resetThemeToDefault(uid: string) {
    const theme = findUserTheme(uid)
    if (!theme) return
    theme.appearance.chrome = {}
    theme.appearance.grid = {}
    theme.constraints = {}
    pushTheme(theme)
  }

  // ── Persistence + hydration ──────────────────────────────────────────────────
  watch(collection, () => { saveThemeCollection(collection) }, { deep: true })

  // Replace the local collection with the server's (the server is authoritative once logged in).
  function adoptServer(serverThemes: unknown[], activeId: string, gate: boolean) {
    const next = normalizeThemeCollection({
      version: THEME_SCHEMA_VERSION,
      activeThemeId: activeId,
      enableCustomStyles: gate,
      userThemes: serverThemes,
    })
    collection.version = next.version
    collection.activeThemeId = next.activeThemeId
    collection.enableCustomStyles = next.enableCustomStyles
    collection.userThemes = next.userThemes
    serverPrefsJson = prefsJson()
  }

  // Server has nothing yet — seed it from whatever the user built locally (logged out).
  async function seedServerFromLocal() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    for (const theme of collection.userThemes) {
      try { await auth.createUserTheme(theme.id, attrsOf(theme)) } catch { /* best-effort */ }
    }
    await pushPrefs(true)
  }

  // React to login: adopt the account's themes if it has any (or non-default prefs); otherwise
  // seed the account from the local copy so we never clobber local work with bare defaults.
  //
  // Hydrate ONCE per user — our own server writes (updateThemePreferences returns the user, which
  // refreshes auth.user) would otherwise re-trigger this watcher and clobber/loop over local
  // edits. After the first hydration the local collection is authoritative; later server writes
  // are fire-and-forget.
  let hydratedUserId: string | null = null
  const auth = useAuthStore()
  watch(() => auth.user, (u) => {
    if (!u) { hydratedUserId = null; return }
    if (u.id === hydratedUserId) return
    hydratedUserId = u.id
    const serverThemes = Array.isArray(u.userThemes) ? u.userThemes : []
    const activeId = u.activeThemeId ?? 'classic'
    const gate = u.enableCustomStyles ?? true
    const serverHasData = serverThemes.length > 0 || activeId !== 'classic' || gate !== true
    if (serverHasData) adoptServer(serverThemes, activeId, gate)
    else void seedServerFromLocal()
  }, { immediate: true })

  return {
    activeTheme,
    activeThemeId,
    enableCustomStyles,
    userThemes,
    allThemes,
    isActiveBuiltIn,
    setActiveTheme,
    setEnableCustomStyles,
    createThemeFrom,
    duplicateTheme,
    renameTheme,
    deleteTheme,
    updateChromeToken,
    updateGridToken,
    updateConstraintOverride,
    resetConstraintToDefault,
    resetThemeToDefault,
  }
})
