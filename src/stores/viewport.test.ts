import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useViewportStore } from './viewport'
import { useGridStore } from './grid'
import { ZOOM_STEP } from '@/utils/viewport'

describe('viewport store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts at the fitted view: viewBox equals the base box', () => {
    const viewport = useViewportStore()
    expect(viewport.clamped.scale).toBe(1)
    expect(viewport.zoomed).toBe(false)
    expect(viewport.viewBox).toEqual(viewport.baseBox)
    const b = viewport.baseBox
    expect(viewport.viewBoxString).toBe(`${b.x} ${b.y} ${b.width} ${b.height}`)
  })

  it('zoomSteps multiply the scale and clamp at maxScale', () => {
    const viewport = useViewportStore()
    viewport.zoomStep(1)
    expect(viewport.clamped.scale).toBeCloseTo(ZOOM_STEP)
    expect(viewport.zoomed).toBe(true)
    for (let i = 0; i < 20; i++) viewport.zoomStep(1)
    expect(viewport.clamped.scale).toBe(viewport.maxScale)
    viewport.zoomStep(-1)
    expect(viewport.clamped.scale).toBeCloseTo(viewport.maxScale / ZOOM_STEP)
  })

  it('panBy moves the view and clamps inside the base box', () => {
    const viewport = useViewportStore()
    viewport.setViewport({ scale: 2, cx: viewport.baseBox.x, cy: viewport.baseBox.y })
    const b = viewport.baseBox
    // At scale 2 the view is half the base per axis: min center is x + w/4.
    expect(viewport.clamped.cx).toBeCloseTo(b.x + b.width / 4)
    viewport.panBy(10, 10)
    expect(viewport.clamped.cx).toBeCloseTo(b.x + b.width / 4 + 10)
    viewport.panBy(-9999, -9999)
    expect(viewport.clamped.cx).toBeCloseTo(b.x + b.width / 4)
    expect(viewport.clamped.cy).toBeCloseTo(b.y + b.height / 4)
  })

  it('panning at scale 1 is inert (no room to pan)', () => {
    const viewport = useViewportStore()
    const before = { ...viewport.clamped }
    viewport.panBy(500, 500)
    expect(viewport.clamped).toEqual(before)
  })

  it('resets to fit when the grid is resized', async () => {
    const viewport = useViewportStore()
    const grid = useGridStore()
    viewport.zoomStep(1)
    viewport.panBy(50, 50)
    expect(viewport.zoomed).toBe(true)
    grid.setDimensions(12, 12)
    await nextTick()
    expect(viewport.zoomed).toBe(false)
    expect(viewport.viewBox).toEqual(viewport.baseBox)
  })

  it('resets even for a same-size load (new grid, different puzzle)', async () => {
    const viewport = useViewportStore()
    const grid = useGridStore()
    grid.setDimensions(9, 9)
    await nextTick()
    viewport.zoomStep(1)
    expect(viewport.zoomed).toBe(true)
    grid.setDimensions(9, 9)
    await nextTick()
    expect(viewport.zoomed).toBe(false)
  })

  it('zoomAt anchors the given point', () => {
    const viewport = useViewportStore()
    const b = viewport.baseBox
    const corner = { x: b.x, y: b.y }
    viewport.zoomAt(corner, 2)
    // Anchored at the top-left corner: the viewBox origin stays there.
    expect(viewport.viewBox.x).toBeCloseTo(b.x)
    expect(viewport.viewBox.y).toBeCloseTo(b.y)
    expect(viewport.clamped.scale).toBe(2)
  })

  it('gesture flags default off', () => {
    const viewport = useViewportStore()
    expect(viewport.touchGestureActive).toBe(false)
    expect(viewport.panLock).toBe(false)
    expect(viewport.spaceHeld).toBe(false)
  })
})
