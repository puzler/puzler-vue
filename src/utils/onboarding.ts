// Persisted onboarding / guided-walkthrough state. Mirrors the localStorage
// pattern in utils/playerSettings.ts (direct get/set, defensively guarded). For
// logged-in users this is also synced to the server via auth.updateOnboarding;
// localStorage is the anonymous fallback and the immediate source of truth on load.

export interface OnboardingState {
  // Tour key -> true once the tour has been finished or dismissed. A growing,
  // monotonic set: keys are only ever added.
  seen: Record<string, boolean>
  // Global "don't show tips" switch.
  disabled: boolean
}

const KEY = 'puzler:onboarding'

export const DEFAULT_ONBOARDING: OnboardingState = { seen: {}, disabled: false }

// Build a fresh default (own `seen` object, never the shared module constant).
function freshDefault(): OnboardingState {
  return { seen: {}, disabled: false }
}

// Merge an arbitrary (possibly partial / server-sourced) value over the defaults,
// keeping only known shapes. Tolerant of missing or extra fields.
export function normalizeOnboarding(raw: unknown): OnboardingState {
  const out = freshDefault()
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    if (r.seen && typeof r.seen === 'object') {
      for (const [k, v] of Object.entries(r.seen as Record<string, unknown>)) {
        if (v === true) out.seen[k] = true
      }
    }
    if (typeof r.disabled === 'boolean') out.disabled = r.disabled
  }
  return out
}

export function loadOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshDefault()
    return normalizeOnboarding(JSON.parse(raw))
  } catch {
    return freshDefault()
  }
}

export function saveOnboarding(state: OnboardingState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore (private mode / unavailable storage)
  }
}
