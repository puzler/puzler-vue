<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { CELL_SIZE } from '@/composables/useGrid'
import { nodeCoord, segmentNodes, segmentMidpoint } from '@/utils/pen'

// Solver pen annotations: committed segments / X / O marks, plus a live
// preview of the stroke being dragged. Colors are palette keys resolved
// through swatchForKey (the raw opaque swatch — thin lines need contrast, not
// the pastel used for cell fills). Never intercepts pointer events.

const editor = useEditorStore()
const palette = useColorPaletteStore()

const STROKE_WIDTH = 3
// The O's radius slightly overshoots the X's half-extent: at equal geometric
// bounds a circle reads smaller than a pointed shape (typographic overshoot),
// so the bump is what makes the two marks LOOK the same height.
const X_HALF = CELL_SIZE * 0.28
const O_RADIUS = CELL_SIZE * 0.3
const EDGE_X_HALF = CELL_SIZE * 0.12

interface SegmentLine {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

const segments = computed<SegmentLine[]>(() => {
  const out: SegmentLine[] = []
  for (const [key, colorKey] of Object.entries(editor.penState.segments)) {
    const nodes = segmentNodes(key)
    if (!nodes) continue
    const a = nodeCoord(nodes[0])
    const b = nodeCoord(nodes[1])
    if (!a || !b) continue
    out.push({ key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: palette.swatchForKey(colorKey) })
  }
  return out
})

const cellMarks = computed(() => {
  const out: { key: string; x: number; y: number; shape: 'x' | 'o'; color: string }[] = []
  for (const [key, mark] of Object.entries(editor.penState.cellMarks)) {
    const c = nodeCoord(key)
    if (!c) continue
    out.push({ key, x: c.x, y: c.y, shape: mark.shape, color: palette.swatchForKey(mark.color) })
  }
  return out
})

const edgeMarks = computed(() => {
  const out: { key: string; x: number; y: number; color: string }[] = []
  for (const [key, colorKey] of Object.entries(editor.penState.edgeMarks)) {
    const mid = segmentMidpoint(key)
    if (!mid) continue
    out.push({ key, x: mid.x, y: mid.y, color: palette.swatchForKey(colorKey) })
  }
  return out
})

// The in-flight stroke. A draw pass previews in the selected color at reduced
// opacity (reads as uncommitted); an erase pass previews dashed in the error
// color regardless of the selected swatch, so the two are unmistakable.
const pending = computed(() => {
  const stroke = editor.pendingPenStroke
  if (!stroke || stroke.nodes.length < 2) return null
  const points = stroke.nodes
    .map((n) => nodeCoord(n))
    .filter((p): p is { x: number; y: number } => p !== null)
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
  const erase = stroke.pass === 'erase'
  return {
    points,
    stroke: erase ? 'var(--color-grid-error)' : palette.swatchForKey(editor.penColorKey ?? ''),
    dash: erase ? '6 5' : undefined,
    opacity: erase ? 0.9 : 0.6,
  }
})
</script>

<template>
  <g pointer-events="none">
    <line
      v-for="s in segments"
      :key="s.key"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
      :stroke="s.color"
      :stroke-width="STROKE_WIDTH"
      stroke-linecap="round"
    />
    <g
      v-for="m in cellMarks"
      :key="m.key"
    >
      <template v-if="m.shape === 'x'">
        <line
          :x1="m.x - X_HALF"
          :y1="m.y - X_HALF"
          :x2="m.x + X_HALF"
          :y2="m.y + X_HALF"
          :stroke="m.color"
          :stroke-width="STROKE_WIDTH"
          stroke-linecap="round"
        />
        <line
          :x1="m.x - X_HALF"
          :y1="m.y + X_HALF"
          :x2="m.x + X_HALF"
          :y2="m.y - X_HALF"
          :stroke="m.color"
          :stroke-width="STROKE_WIDTH"
          stroke-linecap="round"
        />
      </template>
      <circle
        v-else
        :cx="m.x"
        :cy="m.y"
        :r="O_RADIUS"
        fill="none"
        :stroke="m.color"
        :stroke-width="STROKE_WIDTH"
      />
    </g>
    <g
      v-for="m in edgeMarks"
      :key="m.key"
    >
      <line
        :x1="m.x - EDGE_X_HALF"
        :y1="m.y - EDGE_X_HALF"
        :x2="m.x + EDGE_X_HALF"
        :y2="m.y + EDGE_X_HALF"
        :stroke="m.color"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="round"
      />
      <line
        :x1="m.x - EDGE_X_HALF"
        :y1="m.y + EDGE_X_HALF"
        :x2="m.x + EDGE_X_HALF"
        :y2="m.y - EDGE_X_HALF"
        :stroke="m.color"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="round"
      />
    </g>
    <polyline
      v-if="pending"
      :points="pending.points"
      fill="none"
      :stroke="pending.stroke"
      :stroke-width="STROKE_WIDTH"
      :stroke-dasharray="pending.dash"
      :opacity="pending.opacity"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</template>
