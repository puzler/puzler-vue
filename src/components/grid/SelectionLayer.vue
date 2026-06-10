<script setup lang="ts">
import { computed } from 'vue'
import {
  CELL_SIZE, PADDING, THIN_STROKE, BOX_STROKE, OUTER_STROKE,
  cellKey, keyToRowCol,
} from '@/composables/useGrid'
import { useGridStore } from '@/stores/grid'

const props = defineProps<{
  selection: Set<string>
}>()

const grid = useGridStore()

const SEL_STROKE = 4
const SEL_HALF = SEL_STROKE / 2
const CORNER_RADIUS = 3
const EDGE_GAP = 0.25

const STROKE_HALF = {
  thin: THIN_STROKE / 2,
  thick: BOX_STROKE / 2,
  outer: OUTER_STROKE / 2,
  none: THIN_STROKE / 2,
} as const

// Inset from the boundary between two cells, sized so the selection stroke
// sits flush against whatever line is drawn there (thin cell line, thick
// region border, or outer edge) without painting over it. Bridge segments
// (where the outline crosses between two selected cells) compute the far
// endpoint with the NEIGHBOR's edge inset — the loop-stitching below joins
// segments by exact point equality, so both sides of a crossing must agree
// even when the border changes thickness at that lattice point.
function edgeInset(rowA: number, colA: number, rowB: number, colB: number): number {
  const inBounds = (r: number, c: number) => r >= 0 && r < grid.rows && c >= 0 && c < grid.cols
  const type = inBounds(rowA, colA) && inBounds(rowB, colB)
    ? grid.regionBorderType(cellKey(rowA, colA), cellKey(rowB, colB))
    : 'outer'
  return SEL_HALF + STROKE_HALF[type] + EDGE_GAP
}

interface Point { x: number; y: number }

function dist(a: Point, b: Point): number { return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) }
function lerp(a: Point, b: Point, t: number): Point { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } }

const pathSegments = computed<Point[][]>(() => {
  if (props.selection.size === 0) return []

  const paths = [] as Point[][]
  props.selection.forEach(key => {
    const { row, col } = keyToRowCol(key)

    const x0 = (col * CELL_SIZE) + PADDING
    const y0 = (row * CELL_SIZE) + PADDING
    const x1 = x0 + CELL_SIZE
    const y1 = y0 + CELL_SIZE

    const tOff = edgeInset(row - 1, col, row, col)
    const bOff = edgeInset(row, col, row + 1, col)
    const lOff = edgeInset(row, col - 1, row, col)
    const rOff = edgeInset(row, col, row, col + 1)

    const {
      top, right, bottom, left,
      topLeft, topRight, bottomRight, bottomLeft,
    } = neighborsAreSelected(row, col)

    if (!(top && left && topLeft)) {
      const start = { x: x0 + lOff, y: y0 + tOff }
      if (top) {
        // Bridge up into the neighbor: far x uses ITS left-edge inset
        paths.push([
          start,
          { x: x0 + edgeInset(row - 1, col - 1, row - 1, col), y: y0 - tOff },
        ])
      } else {
        paths.push([
          start,
          { x: x1 - rOff, y: y0 + tOff },
        ])
      }
    }

    if (!(top && right && topRight)) {
      const start = { x: x1 - rOff, y: y0 + tOff }
      if (right) {
        // Bridge right into the neighbor: far y uses ITS top-edge inset
        paths.push([
          start,
          { x: x1 + rOff, y: y0 + edgeInset(row - 1, col + 1, row, col + 1) },
        ])
      } else {
        paths.push([
          start,
          { x: x1 - rOff, y: y1 - bOff },
        ])
      }
    }

    if (!(bottom && right && bottomRight)) {
      const start = { x: x1 - rOff, y: y1 - bOff }
      if (bottom) {
        // Bridge down into the neighbor: far x uses ITS right-edge inset
        paths.push([
          start,
          { x: x1 - edgeInset(row + 1, col, row + 1, col + 1), y: y1 + bOff },
        ])
      } else {
        paths.push([
          start,
          { x: x0 + lOff, y: y1 - bOff },
        ])
      }

    }

    if (!(bottom && left && bottomLeft)) {
      const start = { x: x0 + lOff, y: y1 - bOff }
      if (left) {
        // Bridge left into the neighbor: far y uses ITS bottom-edge inset
        paths.push([
          start,
          { x: x0 - lOff, y: y1 - edgeInset(row, col - 1, row + 1, col - 1) },
        ])
      } else {
        paths.push([
          start,
          { x: x0 + lOff, y: y0 + tOff },
        ])
      }
    }
  })

  return paths;
})

const selectionPaths = computed<string[]>(() => {
  return connectPoints(pathSegments.value).map((loop: Point[]) => {
    // Remove duplicate closing point to get the cyclic vertex list
    const pts = loop.slice(0, -1)
    const n = pts.length
    if (n < 2) return ''

    const parts: string[] = []
    let firstMove = true

    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n]
      const curr = pts[i]
      const next = pts[(i + 1) % n]

      // Cross product of incoming × outgoing direction — positive = right turn = convex outer corner
      const isConvex = ((curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x)) > 0

      if (isConvex) {
        const lenIn = dist(prev, curr)
        const lenOut = dist(curr, next)
        const r = Math.min(CORNER_RADIUS, lenIn / 2, lenOut / 2)
        const entry = lerp(prev, curr, (lenIn - r) / lenIn)
        const exit = lerp(curr, next, r / lenOut)
        if (firstMove) { parts.push(`M ${entry.x} ${entry.y}`); firstMove = false }
        else parts.push(`L ${entry.x} ${entry.y}`)
        parts.push(`Q ${curr.x} ${curr.y} ${exit.x} ${exit.y}`)
      } else {
        if (firstMove) { parts.push(`M ${curr.x} ${curr.y}`); firstMove = false }
        else parts.push(`L ${curr.x} ${curr.y}`)
      }
    }

    parts.push('Z')
    return parts.join(' ')
  })
})

const pointsEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y

const connectPoints = (segments: Point[][]) => {
  const connectedSegments = [] as Point[][]
  const visited = new Set<string>()
  for (const segment of segments) {
    const segmentKey = `${segment[0].x},${segment[0].y}`
    if (!visited.has(segmentKey)) {
      const path = [segment[0], segment[1]]
      visited.add(segmentKey)
      visited.add(`${segment[1].x},${segment[1].y}`)
  
      let extended = true
      while (extended) {
        const nextPoint = segments.find(s => (pointsEqual(s[0], path[path.length - 1])))![1]
        path.push(nextPoint)
        const nextPointKey = `${nextPoint.x},${nextPoint.y}`
        if (!visited.has(nextPointKey)) {
          visited.add(nextPointKey)
        } else {
          extended = false
        }
      }
      connectedSegments.push(path)
    }
  }
  return connectedSegments
}

const neighborsAreSelected = (row: number, col: number) => {
  const top = props.selection.has(cellKey(row - 1, col))
  const right = props.selection.has(cellKey(row, col + 1))
  const bottom = props.selection.has(cellKey(row + 1, col))
  const left = props.selection.has(cellKey(row, col - 1))

  const topLeft = props.selection.has(cellKey(row - 1, col - 1))
  const topRight = props.selection.has(cellKey(row - 1, col + 1))
  const bottomRight = props.selection.has(cellKey(row + 1, col + 1))
  const bottomLeft = props.selection.has(cellKey(row + 1, col - 1))

  return { top, right, bottom, left, topLeft, topRight, bottomRight, bottomLeft }
}
</script>

<template>
  <g v-if="selection.size > 0">
    <path
      v-for="(pathData, i) in selectionPaths"
      :key="i"
      :d="pathData"
      fill="none"
      stroke="#F0A93B"
      :stroke-width="SEL_STROKE"
      stroke-opacity="0.85"
      stroke-linejoin="round"
    />
  </g>
</template>
