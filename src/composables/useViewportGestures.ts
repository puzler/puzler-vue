import { watch, type Ref } from 'vue'
import { useViewportStore } from '@/stores/viewport'
import { pointerToSvgPoint } from './useGrid'
import type { ViewRect, Viewport } from '@/utils/viewport'

// Wheel + multi-touch viewport gestures for the grid SVG. Always on for
// interactive grids: Ctrl/Cmd+wheel (and trackpad pinch, which browsers report
// as ctrl+wheel) zooms at the cursor, plain wheel pans while zoomed, and a
// second touch finger starts a combined pinch-zoom/two-finger-pan.
//
// The pinch math is computed purely from a gesture-start snapshot rather than
// re-measured per move: the viewBox is a reactive binding that flushes async,
// so getScreenCTM()/getBoundingClientRect() are one frame stale mid-gesture.
// With preserveAspectRatio="meet" and an aspect-invariant viewBox, the
// letterbox origin (ox, oy) never moves and px-per-unit is k1·vb1.width/w2,
// which makes every move's target viewport closed-form from the snapshot.
interface PinchSnapshot {
  base: ViewRect
  vb1: ViewRect
  k1: number
  ox: number
  oy: number
  mid0: { x: number; y: number }
  dist0: number
  anchor: { x: number; y: number }
  ids: [number, number]
}

export function useViewportGestures(
  svgEl: Ref<SVGSVGElement | null>,
  opts: { enabled: () => boolean },
) {
  const viewport = useViewportStore()

  // ---- Wheel -------------------------------------------------------------

  function wheelDelta(event: WheelEvent): { dx: number; dy: number } {
    // DOM_DELTA_LINE (Firefox wheel) reports lines, not pixels.
    const unit = event.deltaMode === 1 ? 16 : 1
    return { dx: event.deltaX * unit, dy: event.deltaY * unit }
  }

  function onWheel(event: WheelEvent) {
    if (!opts.enabled()) return
    const svg = svgEl.value
    if (!svg) return
    const { dx, dy } = wheelDelta(event)
    if (event.ctrlKey || event.metaKey) {
      const anchor = pointerToSvgPoint(event, svg)
      if (!anchor) return
      event.preventDefault()
      viewport.zoomAt(anchor, viewport.clamped.scale * Math.exp(-dy * 0.01))
    } else if (viewport.zoomed) {
      // Plain wheel / two-finger trackpad scroll pans while zoomed. The grid's
      // containers are overflow-hidden, so there is no page scroll to steal.
      event.preventDefault()
      const rect = svg.getBoundingClientRect()
      const vb = viewport.viewBox
      const k = Math.min(rect.width / vb.width, rect.height / vb.height)
      if (k > 0) viewport.panBy(dx / k, dy / k)
    }
  }

  // ---- Pinch zoom / two-finger pan ----------------------------------------

  const touchPoints = new Map<number, { x: number; y: number }>()
  let pinch: PinchSnapshot | null = null
  let rafId: number | null = null

  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  function beginPinch(svg: SVGSVGElement) {
    const [idA, idB] = [...touchPoints.keys()]
    const a = touchPoints.get(idA)!
    const b = touchPoints.get(idB)!
    const rect = svg.getBoundingClientRect()
    const base = { ...viewport.baseBox }
    const vb1 = { ...viewport.viewBox }
    const k1 = Math.min(rect.width / vb1.width, rect.height / vb1.height)
    if (k1 <= 0) return
    const ox = rect.left + (rect.width - k1 * vb1.width) / 2
    const oy = rect.top + (rect.height - k1 * vb1.height) / 2
    const mid0 = mid(a, b)
    pinch = {
      base, vb1, k1, ox, oy, mid0,
      dist0: Math.max(dist(a, b), 1),
      anchor: { x: vb1.x + (mid0.x - ox) / k1, y: vb1.y + (mid0.y - oy) / k1 },
      ids: [idA, idB],
    }
    // Raised BEFORE InteractionLayer's own pointerdown runs (this listener is
    // capture-phase), so the in-progress single-finger gesture aborts and no
    // new one starts. Stays raised until every touch finger lifts — a
    // surviving finger after a pinch must not start a stray selection.
    viewport.touchGestureActive = true
    // Route both pointers to the svg so the gesture survives leaving its
    // bounds (also strips the interaction rect's capture of the first finger).
    for (const id of [idA, idB]) {
      try { svg.setPointerCapture(id) } catch { /* pointer already gone */ }
    }
  }

  function applyPinch() {
    rafId = null
    if (!pinch) return
    const a = touchPoints.get(pinch.ids[0])
    const b = touchPoints.get(pinch.ids[1])
    if (!a || !b) return
    const s1 = pinch.base.width / pinch.vb1.width
    const scale2 = Math.min(
      Math.max(s1 * (dist(a, b) / pinch.dist0), 1),
      viewport.maxScale,
    )
    const w2 = pinch.base.width / scale2
    const h2 = pinch.base.height / scale2
    const k2 = pinch.k1 * (pinch.vb1.width / w2)
    const m = mid(a, b)
    const next: Viewport = {
      scale: scale2,
      cx: pinch.anchor.x - (m.x - pinch.ox) / k2 + w2 / 2,
      cy: pinch.anchor.y - (m.y - pinch.oy) / k2 + h2 / 2,
    }
    viewport.setViewport(next)
  }

  function onPointerDown(event: PointerEvent) {
    if (!opts.enabled() || event.pointerType !== 'touch') return
    const svg = svgEl.value
    if (!svg) return
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touchPoints.size === 2 && !pinch) beginPinch(svg)
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== 'touch' || !touchPoints.has(event.pointerId)) return
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinch && rafId === null) rafId = requestAnimationFrame(applyPinch)
  }

  function onPointerEnd(event: PointerEvent) {
    if (event.pointerType !== 'touch') return
    touchPoints.delete(event.pointerId)
    if (pinch && !pinch.ids.every((id) => touchPoints.has(id))) pinch = null
    if (touchPoints.size === 0) viewport.touchGestureActive = false
  }

  watch(svgEl, (el, _prev, onCleanup) => {
    if (!el) return
    // Wheel must be non-passive to preventDefault; pointer listeners are
    // capture-phase so the pinch flag is up before InteractionLayer's handlers.
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown, true)
    el.addEventListener('pointermove', onPointerMove, true)
    el.addEventListener('pointerup', onPointerEnd, true)
    el.addEventListener('pointercancel', onPointerEnd, true)
    onCleanup(() => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown, true)
      el.removeEventListener('pointermove', onPointerMove, true)
      el.removeEventListener('pointerup', onPointerEnd, true)
      el.removeEventListener('pointercancel', onPointerEnd, true)
      if (rafId !== null) cancelAnimationFrame(rafId)
      touchPoints.clear()
      pinch = null
      viewport.touchGestureActive = false
    })
  }, { immediate: true })

  // Exposed for unit tests that drive the handlers directly.
  return { onWheel, onPointerDown, onPointerMove, onPointerEnd }
}
