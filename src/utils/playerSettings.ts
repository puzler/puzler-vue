// Persisted player/solver-page preferences. Distinct from utils/solverSettings.ts,
// which configures the setter page's solver web-worker assistant — this is the
// player-facing solving experience (timer, colors, checking, highlights).
//
// Mirrors the localStorage pattern in utils/solveProgress.ts (direct get/set,
// defensively guarded). For logged-in users these are also synced to the server
// via auth.updatePlayerPrefs; localStorage is the anonymous fallback and the
// immediate source of truth on load.

export interface PlayerSettings {
  // Visual
  showRowColLabels: boolean
  hideTimer: boolean
  hideColors: boolean
  // Gameplay
  showRulesOnStart: boolean
  highlightSeen: boolean
  // Checking (error / completion)
  checkOnFinish: boolean
  revealPartialProgress: boolean
  highlightConflicts: boolean
  highlightConflictingPencilmarks: boolean
}

const KEY = 'puzler:player-settings'

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  showRowColLabels: false,
  hideTimer: false,
  hideColors: false,
  showRulesOnStart: true,
  highlightSeen: false,
  checkOnFinish: true,
  revealPartialProgress: true,
  highlightConflicts: true,
  highlightConflictingPencilmarks: false,
}

// Merge an arbitrary (possibly partial / server-sourced) object over the
// defaults, keeping only known boolean keys. Tolerant of missing or extra
// fields so settings survive shape changes across versions.
export function normalizePlayerSettings(raw: unknown): PlayerSettings {
  const out = { ...DEFAULT_PLAYER_SETTINGS }
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(DEFAULT_PLAYER_SETTINGS) as (keyof PlayerSettings)[]) {
      const value = (raw as Record<string, unknown>)[key]
      if (typeof value === 'boolean') out[key] = value
    }
  }
  return out
}

export function loadPlayerSettings(): PlayerSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PLAYER_SETTINGS }
    return normalizePlayerSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PLAYER_SETTINGS }
  }
}

export function savePlayerSettings(settings: PlayerSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // ignore (private mode / unavailable storage)
  }
}
