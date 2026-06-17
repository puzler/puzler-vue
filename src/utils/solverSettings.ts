import type { TechniqueOptions } from '@/solver/types'

// Persisted solver preferences. Mirrors the localStorage pattern in
// utils/solveProgress.ts (direct get/set, defensively guarded).

// The set of toggleable logical techniques, all explicitly present once persisted.
export type TechniqueToggles = Required<TechniqueOptions>

export interface SolverSettings {
  showCandidateCounts: boolean
  showLogicalCandidates: boolean
  techniques: TechniqueToggles
}

const KEY = 'puzler:solver-settings'

// Structural techniques default on (the strongest logical solve out of the box);
// the contradiction check is lookahead, so it stays opt-in.
const DEFAULT_TECHNIQUES: TechniqueToggles = {
  subsets: true,
  lockedCandidates: true,
  weakLinkForcing: true,
  parity: true,
  fish: true,
  wings: true,
  contradictionCheck: false,
}

const DEFAULTS: SolverSettings = {
  showCandidateCounts: false,
  showLogicalCandidates: false,
  techniques: DEFAULT_TECHNIQUES,
}

export function loadSolverSettings(): SolverSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS, techniques: { ...DEFAULT_TECHNIQUES } }
    const parsed = JSON.parse(raw) as Partial<SolverSettings>
    return {
      ...DEFAULTS,
      ...parsed,
      // Deep-merge so a missing or partial techniques blob (incl. settings saved
      // before this existed) falls back to the defaults per flag.
      techniques: { ...DEFAULT_TECHNIQUES, ...parsed.techniques },
    }
  } catch {
    return { ...DEFAULTS, techniques: { ...DEFAULT_TECHNIQUES } }
  }
}

export function saveSolverSettings(settings: SolverSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // ignore (private mode / unavailable storage)
  }
}
