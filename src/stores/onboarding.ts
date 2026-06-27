import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { useAuthStore } from './auth'
import {
  loadOnboarding,
  saveOnboarding,
  normalizeOnboarding,
  type OnboardingState,
} from '@/utils/onboarding'

// Guided-walkthrough state: which per-page tours have been seen, plus a global
// "don't show tips" switch. Local-first (localStorage is the immediate source of
// truth and the anonymous fallback); for logged-in users it also syncs to the
// server (auth store owns the mutation) so it follows the account across devices.
//
// DIVERGENCE from stores/playerSettings.ts: `seen` is a monotonic set, so on
// login we UNION local + server keys (rather than letting the server replace
// local). A guest who saw tours then signs in should not re-trigger them.
export const useOnboardingStore = defineStore('onboarding', () => {
  const state = reactive<OnboardingState>(loadOnboarding())

  // The JSON we believe the server currently holds, so auto-sync skips redundant
  // pushes and hydration doesn't echo straight back.
  let serverJson: string | null = null

  // Canonical serialization (sorted seen keys) so dedupe doesn't trip on order.
  function stableJson(s: OnboardingState): string {
    const seen: Record<string, boolean> = {}
    for (const k of Object.keys(s.seen).sort()) {
      if (s.seen[k]) seen[k] = true
    }
    return JSON.stringify({ seen, disabled: s.disabled })
  }

  const snapshot = (): OnboardingState => ({ seen: { ...state.seen }, disabled: state.disabled })

  function pushToServer() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    const json = stableJson(state)
    if (json === serverJson) return
    serverJson = json
    auth.updateOnboarding({ onboardingSeen: { ...state.seen }, onboardingDisabled: state.disabled }).catch(() => {
      serverJson = null // allow a retry on the next change
    })
  }

  // Persist locally on every change, and (for logged-in users) up to the server.
  watch(state, () => {
    saveOnboarding(snapshot())
    pushToServer()
  }, { deep: true })

  // React to the logged-in user arriving (or changing). Union the server's seen
  // set with whatever we have locally and OR the disabled flags, then let the
  // deep watch seed the server with the merged result if it grew.
  const auth = useAuthStore()
  watch(() => auth.user, (u) => {
    if (!u) return
    const server = normalizeOnboarding({ seen: u.onboardingSeen, disabled: u.onboardingDisabled })
    // Record what the server actually holds before merging, so pushToServer only
    // fires when our merged set is a strict superset.
    serverJson = stableJson(server)
    state.seen = { ...server.seen, ...state.seen }
    state.disabled = state.disabled || server.disabled
  }, { immediate: true })

  function isSeen(key: string): boolean {
    return state.seen[key] === true
  }

  function markSeen(key: string) {
    if (state.seen[key]) return
    state.seen[key] = true
  }

  function setDisabled(value: boolean) {
    state.disabled = value
  }

  function resetAll() {
    state.seen = {}
  }

  return { state, isSeen, markSeen, setDisabled, resetAll }
})
