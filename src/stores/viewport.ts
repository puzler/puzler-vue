import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useGridStore } from './grid'
import { usePlayerSettingsStore } from './playerSettings'
import { svgWidth, svgHeight, LABEL_GUTTER } from '@/composables/useGrid'
import { useOuterMargins } from '@/composables/useOuterMargins'
import {
  ZOOM_STEP,
  maxScaleFor,
  fitViewport,
  clampViewport,
  viewBoxFor,
  zoomAtPoint,
  type ViewRect,
  type Viewport,
} from '@/utils/viewport'

// The grid's zoom/pan view state (ephemeral — never persisted). One instance
// serves the whole page: only the interactive grid consumes it (SudokuGrid
// keys on its `interactive` prop), so thumbnails sharing the singleton stores
// are unaffected.
export const useViewportStore = defineStore('viewport', () => {
  const grid = useGridStore()
  const player = usePlayerSettingsStore()
  const margins = useOuterMargins()

  // The full content bounds in SVG user units — the viewBox the grid renders
  // at scale 1. Outer clue margins extend into negative space and the optional
  // row/column labels add a further top/left gutter (this mirrors what
  // SudokuGrid rendered directly before zoom existed).
  const baseBox = computed<ViewRect>(() => {
    const m = margins.value
    const g = player.effective.showRowColLabels ? LABEL_GUTTER : 0
    const left = m.left + g
    const top = m.top + g
    return {
      x: left ? -left : 0, // avoid -0 (Object.is-visible in tests)
      y: top ? -top : 0,
      width: svgWidth(grid.cols) + left + m.right,
      height: svgHeight(grid.rows) + top + m.bottom,
    }
  })

  const maxScale = computed(() => maxScaleFor(grid.rows, grid.cols))

  const raw = ref<Viewport>({ scale: 1, cx: 0, cy: 0 })

  // Always read through the clamp: when the base box moves under a zoomed view
  // (outer margins expanding, labels toggling, grid resize) the stored value
  // may be stale, and re-clamping on read self-heals it.
  const clamped = computed(() => clampViewport(baseBox.value, raw.value, maxScale.value))
  const viewBox = computed(() => viewBoxFor(baseBox.value, clamped.value))
  const viewBoxString = computed(() => {
    const vb = viewBox.value
    return `${vb.x} ${vb.y} ${vb.width} ${vb.height}`
  })
  const zoomed = computed(() => clamped.value.scale > 1.001)

  // Gesture coordination flags. touchGestureActive is raised by the pinch
  // handler so InteractionLayer aborts and suppresses single-finger gestures;
  // panLock is the setter's hand toggle; spaceHeld is the setting-mode
  // hold-Space-to-pan modifier.
  const touchGestureActive = ref(false)
  const panLock = ref(false)
  const spaceHeld = ref(false)

  function reset() {
    raw.value = fitViewport(baseBox.value)
  }

  function setViewport(next: Viewport) {
    raw.value = clampViewport(baseBox.value, next, maxScale.value)
  }

  function zoomAt(anchor: { x: number; y: number }, scale: number) {
    raw.value = zoomAtPoint(baseBox.value, raw.value, anchor, scale, maxScale.value)
  }

  function zoomStep(direction: 1 | -1, anchor?: { x: number; y: number }) {
    const from = clamped.value
    zoomAt(anchor ?? { x: from.cx, y: from.cy }, from.scale * ZOOM_STEP ** direction)
  }

  function panBy(dx: number, dy: number) {
    const from = clamped.value
    setViewport({ ...from, cx: from.cx + dx, cy: from.cy + dy })
  }

  // A different puzzle (or a resize) invalidates the view; snap back to fit.
  // layoutVersion catches same-size loads (a new 9x9 after a zoomed 9x9).
  watch(() => [grid.rows, grid.cols, grid.layoutVersion], reset)

  return {
    baseBox,
    maxScale,
    clamped,
    viewBox,
    viewBoxString,
    zoomed,
    touchGestureActive,
    panLock,
    spaceHeld,
    reset,
    setViewport,
    zoomAt,
    zoomStep,
    panBy,
  }
})
