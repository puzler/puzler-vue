// Theme applier — writes the active theme's appearance tokens onto <html> as inline
// `--color-*` custom properties, overriding the @theme defaults from style.css for the whole
// tree. Because the Tailwind utilities (bg-ink, text-soft, …) and the grid SVG both read
// `var(--color-*)`, this re-themes the app with no per-component changes.
//
// CHROME tokens are always applied. GRID tokens are GATED by enableCustomStyles, so turning
// custom styles off removes the grid overrides and the grid falls back to its defaults (vanilla
// Puzler) while the chrome keeps the user's theme — the headline "Enable Custom Styles" rule.
//
// The pure `applyAppearance` below does the DOM work and is invoked by the reactive
// `useThemeApplier()` composable (added with stores/theme.ts) from App.vue.

import { watch } from 'vue'
import { CHROME_TOKEN_KEYS, GRID_TOKEN_KEYS, luminance, type Theme } from '@/utils/theme'
import { useThemeStore } from '@/stores/theme'

// Every token we might set, so we can clear stale ones when switching themes / toggling the gate.
const ALL_TOKEN_KEYS: readonly string[] = [...CHROME_TOKEN_KEYS, ...GRID_TOKEN_KEYS]

function isDarkTheme(theme: Theme): boolean {
  // Prefer a luminance read of the themed paper surface so custom dark themes are detected too;
  // fall back to the preset lineage when the surface is left at its (light) default.
  const paper = theme.appearance.chrome.paper
  if (paper) return luminance(paper) < 0.5
  return theme.basePresetId === 'dark'
}

function applyMeta(theme: Theme): void {
  const el = document.documentElement
  const dark = isDarkTheme(theme)
  // Inline color-scheme overrides the `:root { color-scheme: light }` rule in style.css, so
  // native controls / form widgets match the theme.
  el.style.colorScheme = dark ? 'dark' : 'light'
  // Keep the browser chrome (mobile address bar / tab color) in step with the navbar.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.appearance.chrome.ink ?? (dark ? '#0B0F19' : '#212B42'))
}

// Apply a theme to the document. Idempotent: tokens the theme (or the gate) doesn't define are
// REMOVED, so there are never orphan overrides left from a previously-active theme.
export function applyAppearance(theme: Theme, enableCustomStyles: boolean): void {
  const el = document.documentElement
  const tokens: Record<string, string> = { ...theme.appearance.chrome }
  if (enableCustomStyles) Object.assign(tokens, theme.appearance.grid)

  for (const key of ALL_TOKEN_KEYS) {
    const value = tokens[key]
    if (value !== undefined) el.style.setProperty(`--color-${key}`, value)
    else el.style.removeProperty(`--color-${key}`)
  }
  applyMeta(theme)
}

// Reactive applier: re-applies the active theme whenever it (or the gate) changes. Invoke once
// near the app root (App.vue) so the whole tree picks up theme changes.
export function useThemeApplier() {
  const theme = useThemeStore()
  watch(
    () => [ theme.activeTheme, theme.enableCustomStyles ] as const,
    ([ active, enabled ]) => applyAppearance(active, enabled),
    { immediate: true, deep: true },
  )
}
