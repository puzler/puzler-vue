import type { TechniqueOptions } from '@/solver/types'

// Persisted solver preferences. Mirrors the localStorage pattern in
// utils/solveProgress.ts (direct get/set, defensively guarded).

// The set of toggleable logical techniques, all explicitly present once
// persisted. The set-equivalence depth is a numeric setting, not a toggle, so it
// lives beside techniques rather than inside this boolean map.
export type TechniqueToggles = Required<Omit<TechniqueOptions, 'setEquivalenceMaxHouses'>>

export interface SolverSettings {
  showCandidateCounts: boolean
  showLogicalCandidates: boolean
  techniques: TechniqueToggles
  setEquivalenceMaxHouses: number
}

const KEY = 'puzler:solver-settings'

// How many houses a set-equivalence collection may combine. Bounded so a stray
// persisted value can't stall the solver.
export const SET_EQUIVALENCE_MIN = 2
export const SET_EQUIVALENCE_MAX = 4
const SET_EQUIVALENCE_DEFAULT = 3

// Structural techniques default on (the strongest logical solve out of the box).
// Set equivalence and the contradiction check stay opt-in — the former is a
// heavier, niche search for irregular grids, the latter is lookahead.
const DEFAULT_TECHNIQUES: TechniqueToggles = {
  subsets: true,
  lockedCandidates: true,
  weakLinkForcing: true,
  sumCounting: true,
  setEquivalence: false,
  parity: true,
  fish: true,
  wings: true,
  contradictionCheck: false,
}

const DEFAULTS: SolverSettings = {
  showCandidateCounts: false,
  showLogicalCandidates: false,
  techniques: DEFAULT_TECHNIQUES,
  setEquivalenceMaxHouses: SET_EQUIVALENCE_DEFAULT,
}

function clampDepth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return SET_EQUIVALENCE_DEFAULT
  return Math.max(SET_EQUIVALENCE_MIN, Math.min(SET_EQUIVALENCE_MAX, Math.round(value)))
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
      setEquivalenceMaxHouses: clampDepth(parsed.setEquivalenceMaxHouses),
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
