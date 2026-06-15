import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { useAuthStore } from './auth'
import {
  loadPlayerSettings,
  savePlayerSettings,
  normalizePlayerSettings,
  DEFAULT_PLAYER_SETTINGS,
  type PlayerSettings,
} from '@/utils/playerSettings'

// Player-facing solver-page settings (timer, colors, checking, highlights).
// Local-first: localStorage is the immediate source of truth and the anonymous
// fallback. For logged-in users we also sync to the server (auth store owns the
// mutation) so settings follow the account across devices.
//
// NOTE: This is unrelated to stores/solver.ts, which drives the setter page's
// solver web-worker assistant. Keep the two separate.
export const usePlayerSettingsStore = defineStore('playerSettings', () => {
  const settings = reactive<PlayerSettings>(loadPlayerSettings())

  // The settings JSON we believe the server currently holds, so the auto-sync
  // skips redundant pushes and hydration doesn't echo straight back.
  let serverJson: string | null = null

  const snapshot = (): PlayerSettings => ({ ...settings })

  function applyServerSettings(raw: unknown) {
    const next = normalizePlayerSettings(raw)
    serverJson = JSON.stringify(next)
    Object.assign(settings, next)
  }

  // For logged-in users the server is the source of truth, so every change is
  // pushed immediately — a reload on another device then reflects it. Settings
  // are discrete toggles, so there's no burst to debounce.
  function pushToServer() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    const json = JSON.stringify(snapshot())
    if (json === serverJson) return
    serverJson = json
    auth.updatePlayerPrefs({ playerSettings: JSON.parse(json) }).catch(() => {
      serverJson = null // allow a retry on the next change
    })
  }

  function reset() {
    Object.assign(settings, DEFAULT_PLAYER_SETTINGS)
  }

  // Persist locally on every change, and (debounced) up to the server.
  watch(settings, () => {
    savePlayerSettings(snapshot())
    pushToServer()
  }, { deep: true })

  // React to the logged-in user arriving (or changing). When the account has
  // saved settings, adopt them; when it has none yet (fresh `{}` default), seed
  // the server from whatever the user has locally so we never clobber local
  // customizations with bare defaults.
  const auth = useAuthStore()
  watch(() => auth.user, (u) => {
    if (!u) return
    const raw = u.playerSettings
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      applyServerSettings(raw)
    } else {
      pushToServer()
    }
  }, { immediate: true })

  return { settings, reset }
})
