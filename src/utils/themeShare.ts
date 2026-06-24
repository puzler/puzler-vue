// Share a theme as a portable, copy-pasteable code: lz-string-compressed JSON behind a versioned
// prefix. Import always runs the decoded payload through normalizeTheme, so a malformed or
// hand-edited code can never inject unknown keys or out-of-range values; it falls back to a safe
// theme, or returns null when the code is not readable at all.

import { compressToBase64, decompressFromBase64 } from 'lz-string'
import { type Theme, normalizeTheme } from '@/utils/theme'

export const THEME_SHARE_PREFIX = 'puzler-theme-v1:'

// Serialize only the style-bearing fields. The id is per-user identity, reassigned on import, so
// it is deliberately left out of the shared payload.
export function exportThemeCode(theme: Theme): string {
  const payload = {
    schemaVersion: theme.schemaVersion,
    name: theme.name,
    basePresetId: theme.basePresetId,
    appearance: theme.appearance,
    constraints: theme.constraints,
  }
  return THEME_SHARE_PREFIX + compressToBase64(JSON.stringify(payload))
}

// Returns a normalized Theme (with a placeholder id the store replaces) or null if the code is not
// a readable theme code. The leading prefix is optional so users can paste with or without it.
export function importThemeCode(code: string): Theme | null {
  const trimmed = (code ?? '').trim()
  if (!trimmed) return null
  const body = trimmed.startsWith(THEME_SHARE_PREFIX) ? trimmed.slice(THEME_SHARE_PREFIX.length) : trimmed

  let json: string | null
  try {
    json = decompressFromBase64(body)
  } catch {
    return null
  }
  if (!json) return null

  try {
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeTheme(parsed, 'imported')
  } catch {
    return null
  }
}
