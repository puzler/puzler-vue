import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useViewportGestures } from './useViewportGestures'
import { useViewportStore } from '@/stores/viewport'

// A fake grid svg: a default 9x9 board's base box is 596x596 (9 cells of 64
// plus 2x10 padding), so a same-size container gives exactly 1 px per user
// unit at fit (k=1) — every expected value below is hand-computable.
function fakeSvg(): SVGSVGElement {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 596, height: 596 }),
    setPointerCapture: () => {},
    clientWidth: 596,
    clientHeight: 596,
  } as unknown as SVGSVGElement
}

function touch(id: number, x: number, y: number): PointerEvent {
  return { pointerId: id, pointerType: 'touch', clientX: x, clientY: y } as PointerEvent
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

describe('useViewportGestures', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function setup() {
    const viewport = useViewportStore()
    const gestures = useViewportGestures(ref(fakeSvg()), { enabled: () => true })
    return { viewport, gestures }
  }

  it('a second touch finger raises touchGestureActive until every finger lifts', () => {
    const { viewport, gestures } = setup()
    gestures.onPointerDown(touch(1, 300, 300))
    expect(viewport.touchGestureActive).toBe(false)
    gestures.onPointerDown(touch(2, 500, 300))
    expect(viewport.touchGestureActive).toBe(true)
    gestures.onPointerEnd(touch(2, 500, 300))
    // One finger still down after a pinch: stays raised so it can't select.
    expect(viewport.touchGestureActive).toBe(true)
    gestures.onPointerEnd(touch(1, 300, 300))
    expect(viewport.touchGestureActive).toBe(false)
  })

  it('mouse pointers never start a viewport gesture', () => {
    const { viewport, gestures } = setup()
    const mouse = { pointerId: 1, pointerType: 'mouse', clientX: 10, clientY: 10 } as PointerEvent
    gestures.onPointerDown(mouse)
    gestures.onPointerDown({ ...mouse, pointerId: 2 } as PointerEvent)
    expect(viewport.touchGestureActive).toBe(false)
  })

  it('spreading two fingers zooms around their midpoint', async () => {
    const { viewport, gestures } = setup()
    gestures.onPointerDown(touch(1, 300, 300))
    gestures.onPointerDown(touch(2, 500, 300))
    // Spread symmetric around the midpoint (400, 300): distance 200 -> 400.
    gestures.onPointerMove(touch(1, 200, 300))
    gestures.onPointerMove(touch(2, 600, 300))
    await frame()
    expect(viewport.clamped.scale).toBeCloseTo(2)
    // The user point that started under the midpoint is still under it:
    // at k=1 the anchor was (400, 300); after the zoom the viewBox must map
    // it back to screen (400, 300) => viewBox origin (200, 150) at k=2.
    expect(viewport.viewBox.x).toBeCloseTo(200)
    expect(viewport.viewBox.y).toBeCloseTo(150)
  })

  it('moving both fingers together pans without rescaling', async () => {
    const { viewport, gestures } = setup()
    viewport.setViewport({ scale: 2, cx: 298, cy: 298 }) // centered at 2x
    const before = viewport.viewBox
    gestures.onPointerDown(touch(1, 300, 300))
    gestures.onPointerDown(touch(2, 500, 300))
    gestures.onPointerMove(touch(1, 260, 240))
    gestures.onPointerMove(touch(2, 460, 240))
    await frame()
    expect(viewport.clamped.scale).toBeCloseTo(2)
    // Fingers moved (-40, -60) px at k=2 => content follows by 20, 30 user
    // units => the viewBox shifts the opposite way.
    expect(viewport.viewBox.x).toBeCloseTo(before.x + 20)
    expect(viewport.viewBox.y).toBeCloseTo(before.y + 30)
  })

  it('a plain wheel pans only while zoomed', () => {
    const { viewport, gestures } = setup()
    const wheel = (dx: number, dy: number) => ({
      deltaX: dx, deltaY: dy, deltaMode: 0, ctrlKey: false, metaKey: false,
      preventDefault: () => {},
    }) as unknown as WheelEvent
    const fitBox = { ...viewport.viewBox }
    gestures.onWheel(wheel(0, 50))
    expect(viewport.viewBox).toEqual(fitBox) // fit view: nothing to pan
    viewport.setViewport({ scale: 2, cx: 298, cy: 298 })
    const before = viewport.viewBox
    gestures.onWheel(wheel(10, 50))
    // k=2 at scale 2 in the 596px container: 10/2 and 50/2 user units.
    expect(viewport.viewBox.x).toBeCloseTo(before.x + 5)
    expect(viewport.viewBox.y).toBeCloseTo(before.y + 25)
  })
})
