// Zoom/pan viewport math for the grid SVG. Pure functions over plain data so
// the tricky parts (clamping, zoom-at-cursor anchoring) are unit-testable.
//
// The viewport is expressed as a scale plus a view-center in SVG user units.
// scale 1 = the whole base box fits (today's behavior); larger scales shrink
// the visible viewBox. Both viewBox axes divide by the same scale, so the
// viewBox aspect ratio always matches the base box. Combined with
// preserveAspectRatio="meet" this keeps the px-per-user-unit factor exactly
// proportional to scale and the letterbox origin invariant, which is what
// makes zoom-at-point closed-form (see zoomAtPoint).

export interface ViewRect {
  x: number
  y: number
  width: number
  height: number
}

export interface Viewport {
  scale: number
  cx: number
  cy: number
}

// One keyboard/button zoom step multiplies the scale by this.
export const ZOOM_STEP = 1.4

// Max zoom grows with the board so a gattai-scale grid can always reach a
// comfortable working view (~6 cells across), while small grids keep a sane
// ceiling instead of a single cell filling the screen.
export function maxScaleFor(rows: number, cols: number): number {
  return Math.max(3, Math.max(rows, cols) / 6)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

// The fitted (unzoomed) viewport: whole base box, centered.
export function fitViewport(base: ViewRect): Viewport {
  return { scale: 1, cx: base.x + base.width / 2, cy: base.y + base.height / 2 }
}

// Clamp scale to [1, maxScale] and keep the view rect fully inside the base
// box. At scale 1 the view rect equals the base box, so the center clamps to
// exactly the base center — clamping a stale viewport after the base box
// changed (grid resize, margins growing) self-heals to a valid view.
export function clampViewport(base: ViewRect, vp: Viewport, maxScale: number): Viewport {
  const scale = clamp(vp.scale, 1, Math.max(1, maxScale))
  const w = base.width / scale
  const h = base.height / scale
  return {
    scale,
    cx: clamp(vp.cx, base.x + w / 2, base.x + base.width - w / 2),
    cy: clamp(vp.cy, base.y + h / 2, base.y + base.height - h / 2),
  }
}

// The SVG viewBox for a (clamped) viewport.
export function viewBoxFor(base: ViewRect, vp: Viewport): ViewRect {
  const w = base.width / vp.scale
  const h = base.height / vp.scale
  return { x: vp.cx - w / 2, y: vp.cy - h / 2, width: w, height: h }
}

// Zoom to newScale keeping the user-space point `anchor` fixed on screen
// (cursor position for wheel zoom, pinch midpoint for touch). Because the
// letterbox origin is scale-invariant (see header), pinning the anchor
// reduces to pulling the center toward it by the scale ratio:
//   cx' = a.x - (s/s') * (a.x - cx)
// The final clamp can shift the anchor near the edges; that is the desired
// "hit the wall" feel rather than overscrolling past the board.
export function zoomAtPoint(
  base: ViewRect,
  vp: Viewport,
  anchor: { x: number; y: number },
  newScale: number,
  maxScale: number,
): Viewport {
  const from = clampViewport(base, vp, maxScale)
  const scale = clamp(newScale, 1, Math.max(1, maxScale))
  const ratio = from.scale / scale
  return clampViewport(base, {
    scale,
    cx: anchor.x - ratio * (anchor.x - from.cx),
    cy: anchor.y - ratio * (anchor.y - from.cy),
  }, maxScale)
}
