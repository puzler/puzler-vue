// Persisted solver preferences. Mirrors the localStorage pattern in
// utils/solveProgress.ts (direct get/set, defensively guarded).

export type SolverTechniqueLevel = 'standard' | 'tough' | 'advanced'

export interface SolverSettings {
  showCandidateCounts: boolean
  showLogicalCandidates: boolean
  techniqueLevel: SolverTechniqueLevel
}

const KEY = 'puzler:solver-settings'

const DEFAULTS: SolverSettings = {
  showCandidateCounts: false,
  showLogicalCandidates: false,
  techniqueLevel: 'standard',
}

export function loadSolverSettings(): SolverSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SolverSettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSolverSettings(settings: SolverSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // ignore (private mode / unavailable storage)
  }
}
