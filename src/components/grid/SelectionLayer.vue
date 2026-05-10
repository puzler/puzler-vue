<script setup lang="ts">
import { computed } from 'vue'
import {
  CELL_SIZE, PADDING, THIN_STROKE,
  cellKey, keyToRowCol,
} from '@/composables/useGrid'

const props = defineProps<{
  selection: Set<string>
}>()

const SEL_STROKE = 4
const SEL_HALF = SEL_STROKE / 2
const CORNER_RADIUS = 3

interface Point { x: number; y: number }

function dist(a: Point, b: Point): number { return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) }
function lerp(a: Point, b: Point, t: number): Point { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } }

const pathSegments = computed<Point[][]>(() => {
  if (props.selection.size === 0) return []

  const paths = [] as Point[][]
  props.selection.forEach(key => {
    const { row, col } = keyToRowCol(key)
    const edgeOffset = SEL_HALF + THIN_STROKE

    const {
      top, right, bottom, left,
      topLeft, topRight, bottomRight, bottomLeft,
    } = neighborsAreSelected(row, col)

    if (!(top && left && topLeft)) {
      const start = { x: (col * CELL_SIZE) + PADDING + edgeOffset, y: (row * CELL_SIZE) + PADDING + edgeOffset }
      if (top) {
        paths.push([
          start,
          { x: start.x, y: start.y - (2 * edgeOffset) },
        ])
      } else {
        paths.push([
          start,
          { x: start.x + CELL_SIZE - (2 * edgeOffset), y: start.y },
        ])
      }
    }

    if (!(top && right && topRight)) {
      const start = { x: ((col + 1) * CELL_SIZE) + PADDING - edgeOffset, y: (row * CELL_SIZE) + PADDING + edgeOffset }
      if (right) {
        paths.push([
          start,
          { x: start.x + (2 * edgeOffset), y: start.y },
        ])
      } else {
        paths.push([
          start,
          { x: start.x, y: start.y + CELL_SIZE - (2 * edgeOffset) },
        ])
      }
    }

    if (!(bottom && right && bottomRight)) {
      const start = { x: ((col + 1) * CELL_SIZE) + PADDING - edgeOffset, y: ((row + 1) * CELL_SIZE) + PADDING - edgeOffset }
      if (bottom) {
        paths.push([
          start,
          { x: start.x, y: start.y + (2 * edgeOffset) },
        ])
      } else {
        paths.push([
          start,
          { x: start.x - CELL_SIZE + (2 * edgeOffset), y: start.y },
        ])
      }

    }

    if (!(bottom && left && bottomLeft)) {
      const start = { x: (col * CELL_SIZE) + PADDING + edgeOffset, y: ((row + 1) * CELL_SIZE) + PADDING - edgeOffset }
      if (left) {
        paths.push([
          start,
          { x: start.x - (2 * edgeOffset), y: start.y },
        ])
      } else {
        paths.push([
          start,
          { x: start.x, y: start.y - CELL_SIZE + (2 * edgeOffset) },
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
      stroke="#3b82f6"
      :stroke-width="SEL_STROKE"
      stroke-opacity="0.7"
      stroke-linejoin="round"
    />
  </g>
</template>
