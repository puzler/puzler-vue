import { nextTick, onMounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useOnboardingStore } from '@/stores/onboarding'
import { startTour, isTourActive } from '@/composables/useTourRunner'
import { ROUTE_TO_TOUR } from '@/data/tours'

// Auto-start a page's first-visit tour. Call once from a toured view's setup.
// Pass `ready` for async pages whose tour anchors only exist after data loads
// (e.g. the player or profile); the tour then waits for ready to be true.
export function usePageTour(opts: { ready?: Ref<boolean> } = {}) {
  const route = useRoute()
  const onboarding = useOnboardingStore()

  async function maybeStart() {
    const key = ROUTE_TO_TOUR[String(route.name)]
    if (!key) return
    if (onboarding.state.disabled) return
    if (onboarding.isSeen(key)) return
    if (isTourActive()) return

    await nextTick()
    // Let route transitions, panel width animations, and any just-closed modal's
    // DOM removal settle before measuring. (A closing modal fires reactive
    // watchers in the pre-flush, before its element is gone, so the modal check
    // must happen after this wait, not before.)
    await new Promise((r) => setTimeout(r, 350))

    // Re-check guards after the wait (modal may be open, user may have navigated).
    if (onboarding.state.disabled || onboarding.isSeen(key) || isTourActive()) return
    if (document.querySelector('[data-modal-open]')) return // do not cover an open modal
    if (ROUTE_TO_TOUR[String(route.name)] !== key) return // navigated away during the wait

    startTour(key, { onDone: () => onboarding.markSeen(key) })
  }

  onMounted(() => {
    if (opts.ready) {
      watch(opts.ready, (v) => { if (v) maybeStart() }, { immediate: true })
    } else {
      maybeStart()
    }
  })
}
