import { ref, computed, onUnmounted } from 'vue'

// A pausable solving timer. Runs for every puzzle (not just timed collections).
// The interval keeps firing while paused but the tick is skipped, so pausing is
// cheap and resuming is instant. Pausing is allowed everywhere for now; a future
// per-collection competition setting may lock it (see plan).
export function usePuzzleTimer() {
  const elapsed = ref(0) // whole seconds
  const paused = ref(false)
  const running = ref(false)
  let handle: ReturnType<typeof setInterval> | null = null
  // Reasons the timer is held (e.g. 'rules', 'manual'). The clock runs only when
  // there are none, so an auto-pause (rules modal) and a manual pause compose
  // without one clobbering the other.
  const holds = ref(new Set<string>())

  function clearHandle() {
    if (handle) { clearInterval(handle); handle = null }
  }

  function tick() {
    if (!paused.value) elapsed.value += 1
  }

  function syncPaused() {
    paused.value = holds.value.size > 0
  }

  function start() {
    clearHandle()
    elapsed.value = 0
    holds.value = new Set()
    paused.value = false
    running.value = true
    handle = setInterval(tick, 1000)
  }

  function stop() {
    clearHandle()
    running.value = false
  }

  // Reset the clock; `keepElapsed` leaves the accumulated time in place (used by
  // the puzzle reset modal's "keep timer running" option).
  function reset(keepElapsed = false) {
    if (!keepElapsed) elapsed.value = 0
  }

  function hold(reason: string) {
    holds.value = new Set(holds.value).add(reason)
    syncPaused()
  }

  function release(reason: string) {
    const next = new Set(holds.value)
    next.delete(reason)
    holds.value = next
    syncPaused()
  }

  // Manual pause toggle (the pause button). Composes with auto-holds via the
  // 'manual' reason.
  function toggle() {
    if (holds.value.has('manual')) release('manual')
    else hold('manual')
  }

  // Resume a persisted session: set the accumulated time and any held reasons
  // (e.g. a 'manual' pause the solver left it in), then run. Unlike start(),
  // this preserves the elapsed value rather than zeroing it.
  function restore(savedElapsed: number, savedHolds: string[] = []) {
    clearHandle()
    elapsed.value = Math.max(0, Math.floor(savedElapsed) || 0)
    holds.value = new Set(savedHolds)
    syncPaused()
    running.value = true
    handle = setInterval(tick, 1000)
  }

  const label = computed(() => {
    const m = Math.floor(elapsed.value / 60)
    const s = elapsed.value % 60
    return `${m}:${String(s).padStart(2, '0')}`
  })

  onUnmounted(stop)

  return { elapsed, paused, running, holds, label, start, stop, reset, restore, hold, release, toggle }
}
