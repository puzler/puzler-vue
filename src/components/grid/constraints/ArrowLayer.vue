<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter, cellsToPath } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { ARROW_STYLE, AVERAGE_ARROW_STYLE, ARROW_TYPES } from '@/types/constraints'
import type { ArrowData } from '@/types/constraints'
import { useConstraintStyles } from '@/composables/useConstraintStyles'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Only the color is themeable in v1 (default ⊕ override, gated); the bulb/line geometry below
// stays at the ARROW_STYLE defaults. Average arrows share the geometry and add a
// dashed ring inset inside the bulb.
const arrowColor = computed(() => cs.arrowStyle().color)
const averageArrowColor = computed(() => cs.averageArrowStyle().color)

const BULB_OUTER = ARROW_STYLE.bulbRadius * 2
const BULB_INNER = BULB_OUTER - ARROW_STYLE.outlineWidth * 2

// Dashed inner ring of an average-arrow bulb. The dash length divides the
// circumference into an even number of dash+gap pairs so the pattern closes
// cleanly where the circle joins up.
const INSET_RADIUS = ARROW_STYLE.bulbRadius - AVERAGE_ARROW_STYLE.bulbInset
const INSET_DASH = (() => {
  const dash = (2 * Math.PI * INSET_RADIUS) / 32
  return `${dash} ${dash}`
})()

type Point = { x: number; y: number }

// Arrows stop short of the final cell center so several can point into the
// same cell without touching (same idea as the thermometer tip inset, but
// tighter — the thin arrow lines stay readable with a smaller gap)
const TIP_INSET = CELL_SIZE * 0.15

// Final point of the arrow line: the last cell center pulled back along the
// final segment by TIP_INSET
function arrowTip(cells: string[]): { x: number; y: number } | null {
  if (cells.length < 2) return null
  const prev = cellCenter(cells[cells.length - 2])
  const end = cellCenter(cells[cells.length - 1])
  const dx = end.x - prev.x
  const dy = end.y - prev.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return null
  return { x: end.x - (dx / len) * TIP_INSET, y: end.y - (dy / len) * TIP_INSET }
}

// Shortest distance from a point to a segment.
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

// Distance from a point to the bulb silhouette's spine (a single cell center, or
// the polyline through the pill's cells). The bulb body extends bulbRadius from
// this spine, so points that far away are outside the bulb.
function distToBulb(p: Point, spine: Point[]): number {
  if (spine.length === 1) return Math.hypot(p.x - spine[0].x, p.y - spine[0].y)
  let min = Infinity
  for (let i = 0; i < spine.length - 1; i++) min = Math.min(min, distToSegment(p, spine[i], spine[i + 1]))
  return min
}

// First point of the arrow line. When the shaft leaves a bulb, end it so its
// round linecap sits fully inside the bulb's outline band and is covered by the
// (opaque) stroke drawn on top. This both hides the shaft's crossing of the
// now-transparent bulb interior and tucks the cap under the outline, so the
// shaft reads as passing cleanly beneath it. `radius` is that target distance
// from the bulb spine; the exit point is found exactly by bisection (a fixed or
// stepped inset would over/undershoot and expose the curved cap). Branch arrows
// anchored on another arrow's cell (spine === null) are unchanged.
function arrowStart(cells: string[], spine: Point[] | null, radius: number): Point {
  const points = cells.map(cellCenter)
  if (!spine || points.length < 2) return points[0]
  let prev = points[0]
  for (let i = 1; i < points.length; i++) {
    const seg = points[i]
    if (distToBulb(seg, spine) >= radius) {
      let lo = 0
      let hi = 1
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2
        const p = { x: prev.x + (seg.x - prev.x) * mid, y: prev.y + (seg.y - prev.y) * mid }
        if (distToBulb(p, spine) < radius) lo = mid
        else hi = mid
      }
      return { x: prev.x + (seg.x - prev.x) * hi, y: prev.y + (seg.y - prev.y) * hi }
    }
    prev = seg
  }
  return points[0]
}

function arrowLinePath(cells: string[], spine: Point[] | null, radius: number): string {
  const points = cells.map(cellCenter)
  points[0] = arrowStart(cells, spine, radius)
  const tip = arrowTip(cells)
  if (tip) points[points.length - 1] = tip
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

// Chevron at the (inset) tip, pointing from the second-to-last cell outward
function arrowHeadPath(cells: string[]): string | null {
  const tip = arrowTip(cells)
  if (!tip) return null
  const prev = cellCenter(cells[cells.length - 2])
  const dx = tip.x - prev.x
  const dy = tip.y - prev.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return null
  const ux = dx / len
  const uy = dy / len
  const L = ARROW_STYLE.headLength
  const bx = tip.x - ux * L
  const by = tip.y - uy * L
  const px = -uy * L * ARROW_STYLE.headSpread
  const py = ux * L * ARROW_STYLE.headSpread
  return `M ${bx + px} ${by + py} L ${tip.x} ${tip.y} L ${bx - px} ${by - py}`
}

interface RenderedArrowInstance {
  id: string
  insetRing: boolean
  bulbCircle: { x: number; y: number } | null
  bulbPath: string | null
  bulbBox: { x: number; y: number; width: number; height: number } | null
  linePaths: string[]
  headPaths: string[]
  lineColor: string
  bulbFillColor: string
  bulbStrokeColor: string
}

// Bounding box of a multi-cell bulb capsule (cell centers padded by the bulb
// radius), used to size the outline mask so the round caps never clip.
function bulbBox(cells: string[]): { x: number; y: number; width: number; height: number } {
  const centers = cells.map(cellCenter)
  const pad = ARROW_STYLE.bulbRadius + 2
  const xs = centers.map(c => c.x)
  const ys = centers.map(c => c.y)
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  return { x: minX, y: minY, width: Math.max(...xs) + pad - minX, height: Math.max(...ys) + pad - minY }
}

// Distance from the bulb spine at which a shaft should end so its round linecap
// falls fully within the outline's stroke band (and is covered by the opaque
// stroke). The band is [r - ow, r] for a multi-cell pill (outline drawn inward
// from the outer edge r) and [r - ow/2, r + ow/2] for a single-cell circle
// (stroke centered on r); the cap must clear the inner edge by its own radius,
// so we center the cap within the remaining span.
function shaftEndRadius(multiBulb: boolean): number {
  const r = ARROW_STYLE.bulbRadius
  const ow = ARROW_STYLE.outlineWidth
  const capR = ARROW_STYLE.lineWidth / 2
  const bandInner = multiBulb ? r - ow : r - ow / 2
  const bandOuter = multiBulb ? r : r + ow / 2
  return (bandInner + capR + bandOuter) / 2
}

function renderInstance(id: string, data: ArrowData, type: string): RenderedArrowInstance {
  const multiBulb = data.bulbCells.length > 1
  const bulbSet = new Set(data.bulbCells)
  // Spine of the bulb silhouette (its cell centers), used to inset shafts that
  // leave the bulb. Shafts anchored elsewhere (branches) pass null.
  const bulbSpine = data.bulbCells.map(cellCenter)
  const endRadius = shaftEndRadius(multiBulb)
  const themeColor = type === 'average_arrow' ? averageArrowColor.value : arrowColor.value
  return {
    id,
    insetRing: type === 'average_arrow',
    bulbCircle: data.bulbCells.length === 1 ? cellCenter(data.bulbCells[0]) : null,
    bulbPath: multiBulb ? cellsToPath(data.bulbCells) : null,
    bulbBox: multiBulb ? bulbBox(data.bulbCells) : null,
    linePaths: data.arrows.map(p => arrowLinePath(p.cells, bulbSet.has(p.cells[0]) ? bulbSpine : null, endRadius)),
    headPaths: data.arrows.map(p => arrowHeadPath(p.cells)).filter((p): p is string => p !== null),
    // Per-instance setter colors beat the theme style; specific beats the
    // generic `color`. The bulb interior stays transparent unless a fill
    // color is set; the generic `color` reaches the outline and the arrows.
    lineColor: data.arrowColor ?? data.color ?? themeColor,
    bulbFillColor: data.bulbFillColor ?? 'transparent',
    bulbStrokeColor: data.bulbStrokeColor ?? data.color ?? themeColor,
  }
}

const arrowInstances = computed<RenderedArrowInstance[]>(() =>
  editor.cosmeticInstances
    .filter(i => ARROW_TYPES.has(i.type))
    .map(i => renderInstance(i.id, i.data as ArrowData, i.type)),
)

const pending = computed<RenderedArrowInstance | null>(() => {
  if (!ARROW_TYPES.has(editor.activeTool)) return null
  const cells = editor.pendingLineCells
  if (cells.length === 0) return null
  if (editor.pendingArrowParentId) {
    if (cells.length < 2) return null
    return renderInstance('pending', { bulbCells: [], arrows: [{ cells }] }, editor.activeTool)
  }
  // Average-arrow bulbs clamp to a single cell on commit; preview the same.
  const bulbCells = editor.activeTool === 'average_arrow' ? [cells[0]] : cells
  return renderInstance('pending', { bulbCells, arrows: [] }, editor.activeTool)
})
</script>

<template>
  <g pointer-events="none">
    <g
      v-for="inst in [...arrowInstances, ...(pending ? [pending] : [])]"
      :key="inst.id"
      :opacity="inst.id === 'pending' ? 0.55 : 1"
    >
      <!-- Arrow lines and heads first so the bulb covers their anchors -->
      <path
        v-for="(line, i) in inst.linePaths"
        :key="`line-${i}`"
        :d="line"
        fill="none"
        :stroke="inst.lineColor"
        :stroke-width="ARROW_STYLE.lineWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-for="(head, i) in inst.headPaths"
        :key="`head-${i}`"
        :d="head"
        fill="none"
        :stroke="inst.lineColor"
        :stroke-width="ARROW_STYLE.lineWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Single-cell bulb: outlined circle with a transparent interior by
           default. Multi-cell bulb: pill outline drawn as a hollow ring so the
           grid shows through, with an optional fill painted inside. -->
      <circle
        v-if="inst.bulbCircle"
        :cx="inst.bulbCircle.x"
        :cy="inst.bulbCircle.y"
        :r="ARROW_STYLE.bulbRadius"
        :fill="inst.bulbFillColor"
        :stroke="inst.bulbStrokeColor"
        :stroke-width="ARROW_STYLE.outlineWidth"
      />
      <!-- Average arrow: dashed ring inset inside the bulb -->
      <circle
        v-if="inst.bulbCircle && inst.insetRing"
        :cx="inst.bulbCircle.x"
        :cy="inst.bulbCircle.y"
        :r="INSET_RADIUS"
        fill="none"
        :stroke="inst.bulbStrokeColor"
        :stroke-width="ARROW_STYLE.outlineWidth"
        :stroke-dasharray="INSET_DASH"
      />
      <template v-if="inst.bulbPath && inst.bulbBox">
        <!-- Fill: painted only when a fill color is set (transparent by default) -->
        <path
          :d="inst.bulbPath"
          fill="none"
          :stroke="inst.bulbFillColor"
          :stroke-width="BULB_INNER"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Outline ring: the capsule silhouette minus its inset interior -->
        <mask
          :id="`arrow-bulb-${inst.id}`"
          maskUnits="userSpaceOnUse"
        >
          <path
            :d="inst.bulbPath"
            fill="none"
            stroke="white"
            :stroke-width="BULB_OUTER"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            :d="inst.bulbPath"
            fill="none"
            stroke="black"
            :stroke-width="BULB_INNER"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>
        <rect
          :x="inst.bulbBox.x"
          :y="inst.bulbBox.y"
          :width="inst.bulbBox.width"
          :height="inst.bulbBox.height"
          :fill="inst.bulbStrokeColor"
          :mask="`url(#arrow-bulb-${inst.id})`"
        />
      </template>
    </g>
  </g>
</template>
