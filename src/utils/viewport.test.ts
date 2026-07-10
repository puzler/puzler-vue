import { describe, it, expect } from 'vitest'
import {
  ZOOM_STEP,
  maxScaleFor,
  fitViewport,
  clampViewport,
  viewBoxFor,
  zoomAtPoint,
  type ViewRect,
  type Viewport,
} from './viewport'

// A 9x9-ish base box with an offset origin (outer margins push x/y negative).
const BASE: ViewRect = { x: -74, y: -74, width: 724, height: 724 }
// Non-square base (e.g. a 21x45 shogun layout).
const WIDE: ViewRect = { x: 0, y: 0, width: 900, height: 420 }
const MAX = 8

describe('maxScaleFor', () => {
  it('floors at 3 for small grids', () => {
    expect(maxScaleFor(9, 9)).toBe(3)
    expect(maxScaleFor(2, 2)).toBe(3)
  })

  it('grows with the largest dimension (~6 cells visible at max)', () => {
    expect(maxScaleFor(48, 48)).toBe(8)
    expect(maxScaleFor(21, 45)).toBe(7.5)
  })
})

describe('fitViewport', () => {
  it('centers the base box at scale 1', () => {
    expect(fitViewport(BASE)).toEqual({ scale: 1, cx: 288, cy: 288 })
    expect(fitViewport(WIDE)).toEqual({ scale: 1, cx: 450, cy: 210 })
  })
})

describe('viewBoxFor', () => {
  it('is the base box at the fitted viewport', () => {
    expect(viewBoxFor(BASE, fitViewport(BASE))).toEqual(BASE)
  })

  it('divides both axes by scale, preserving the base aspect ratio', () => {
    const vb = viewBoxFor(WIDE, { scale: 2, cx: 450, cy: 210 })
    expect(vb).toEqual({ x: 225, y: 105, width: 450, height: 210 })
    expect(vb.width / vb.height).toBeCloseTo(WIDE.width / WIDE.height)
  })
})

describe('clampViewport', () => {
  it('clamps scale to [1, maxScale]', () => {
    expect(clampViewport(BASE, { scale: 0.4, cx: 288, cy: 288 }, MAX).scale).toBe(1)
    expect(clampViewport(BASE, { scale: 99, cx: 288, cy: 288 }, MAX).scale).toBe(MAX)
  })

  it('forces the center at scale 1 (fit view has no pan freedom)', () => {
    const vp = clampViewport(BASE, { scale: 1, cx: -500, cy: 9999 }, MAX)
    expect(vp).toEqual(fitViewport(BASE))
  })

  it('keeps the view rect inside the base box at every edge', () => {
    // At scale 2 the view is 362x362; centers range within [107, 469] on both axes.
    const lo = clampViewport(BASE, { scale: 2, cx: -1000, cy: -1000 }, MAX)
    expect(lo).toEqual({ scale: 2, cx: -74 + 181, cy: -74 + 181 })
    const hi = clampViewport(BASE, { scale: 2, cx: 1000, cy: 1000 }, MAX)
    expect(hi).toEqual({ scale: 2, cx: 650 - 181, cy: 650 - 181 })
    const inside = clampViewport(BASE, { scale: 2, cx: 300, cy: 200 }, MAX)
    expect(inside).toEqual({ scale: 2, cx: 300, cy: 200 })
  })

  it('self-heals a viewport that a base-box shrink left out of bounds', () => {
    const big: ViewRect = { x: 0, y: 0, width: 2000, height: 2000 }
    const vp: Viewport = clampViewport(big, { scale: 4, cx: 1800, cy: 1800 }, MAX)
    // Base shrinks (grid resized down): the same viewport re-clamps into range.
    const healed = clampViewport(WIDE, vp, MAX)
    const vb = viewBoxFor(WIDE, healed)
    expect(vb.x).toBeGreaterThanOrEqual(WIDE.x)
    expect(vb.y).toBeGreaterThanOrEqual(WIDE.y)
    expect(vb.x + vb.width).toBeLessThanOrEqual(WIDE.x + WIDE.width)
    expect(vb.y + vb.height).toBeLessThanOrEqual(WIDE.y + WIDE.height)
  })

  it('tolerates a maxScale below 1', () => {
    expect(clampViewport(BASE, { scale: 2, cx: 0, cy: 0 }, 0.5).scale).toBe(1)
  })
})

describe('zoomAtPoint', () => {
  const anchorScreenPos = (base: ViewRect, vp: Viewport, anchor: { x: number; y: number }) => {
    // Screen position of a user point is proportional to (anchor - viewBox
    // origin) * scale, since px-per-unit is proportional to scale and the
    // letterbox origin is invariant (see viewport.ts header).
    const vb = viewBoxFor(base, vp)
    return { x: (anchor.x - vb.x) * vp.scale, y: (anchor.y - vb.y) * vp.scale }
  }

  it('keeps the anchor point fixed on screen while zooming in and out', () => {
    const anchor = { x: 100, y: 400 }
    const start = clampViewport(BASE, { scale: 2, cx: 288, cy: 288 }, MAX)
    const before = anchorScreenPos(BASE, start, anchor)
    const zoomedIn = zoomAtPoint(BASE, start, anchor, 4, MAX)
    const after = anchorScreenPos(BASE, zoomedIn, anchor)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    const zoomedOut = zoomAtPoint(BASE, zoomedIn, anchor, 2, MAX)
    expect(zoomedOut.cx).toBeCloseTo(start.cx)
    expect(zoomedOut.cy).toBeCloseTo(start.cy)
  })

  it('clamps the result: zooming out to 1 recenters regardless of anchor', () => {
    const start: Viewport = { scale: 4, cx: 200, cy: 200 }
    expect(zoomAtPoint(BASE, start, { x: 0, y: 0 }, 0.2, MAX)).toEqual(fitViewport(BASE))
  })

  it('lets the anchor shift rather than overscroll when pinned near an edge', () => {
    // Zoom in on the top-left corner: the ideal center would put the view
    // rect outside the base box, so it clamps to the corner instead.
    const start = fitViewport(BASE)
    const vp = zoomAtPoint(BASE, start, { x: BASE.x, y: BASE.y }, 2, MAX)
    const vb = viewBoxFor(BASE, vp)
    expect(vb.x).toBeCloseTo(BASE.x)
    expect(vb.y).toBeCloseTo(BASE.y)
  })

  it('respects maxScale', () => {
    const vp = zoomAtPoint(BASE, fitViewport(BASE), { x: 300, y: 300 }, 999, MAX)
    expect(vp.scale).toBe(MAX)
  })

  it('steps by ZOOM_STEP compose multiplicatively', () => {
    const start = fitViewport(BASE)
    const one = zoomAtPoint(BASE, start, { x: 288, y: 288 }, start.scale * ZOOM_STEP, MAX)
    const two = zoomAtPoint(BASE, one, { x: 288, y: 288 }, one.scale * ZOOM_STEP, MAX)
    expect(two.scale).toBeCloseTo(ZOOM_STEP * ZOOM_STEP)
  })
})
