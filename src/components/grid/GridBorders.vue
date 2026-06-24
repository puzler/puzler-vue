<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING, THIN_STROKE, BOX_STROKE, OUTER_STROKE, cellKey } from '@/composables/useGrid'

const grid = useGridStore()

interface Segment { x1: number; y1: number; x2: number; y2: number }

function hSegs(borderType: 'thin' | 'thick' | 'outer'): Segment[] {
  const segs: Segment[] = []
  for (let r = 1; r < grid.rows; r++) {
    const y = PADDING + r * CELL_SIZE
    for (let c = 0; c < grid.cols; c++) {
      if (grid.regionBorderType(cellKey(r - 1, c), cellKey(r, c)) !== borderType) continue
      segs.push({ x1: PADDING + c * CELL_SIZE, y1: y, x2: PADDING + (c + 1) * CELL_SIZE, y2: y })
    }
  }
  return segs
}

function vSegs(borderType: 'thin' | 'thick' | 'outer'): Segment[] {
  const segs: Segment[] = []
  for (let c = 1; c < grid.cols; c++) {
    const x = PADDING + c * CELL_SIZE
    for (let r = 0; r < grid.rows; r++) {
      if (grid.regionBorderType(cellKey(r, c - 1), cellKey(r, c)) !== borderType) continue
      segs.push({ x1: x, y1: PADDING + r * CELL_SIZE, x2: x, y2: PADDING + (r + 1) * CELL_SIZE })
    }
  }
  return segs
}

const thinH = computed(() => hSegs('thin'))
const thinV = computed(() => vSegs('thin'))
const thickH = computed(() => hSegs('thick'))
const thickV = computed(() => vSegs('thick'))
const outerH = computed(() => hSegs('outer'))
const outerV = computed(() => vSegs('outer'))

const puzzleEdge = computed<Segment[]>(() => {
  const segs: Segment[] = []
  const labels = grid.cellRegionLabelMap
  for (let c = 0; c < grid.cols; c++) {
    if (labels.get(cellKey(0, c)) !== null)
      segs.push({ x1: PADDING + c * CELL_SIZE, y1: PADDING, x2: PADDING + (c + 1) * CELL_SIZE, y2: PADDING })
    if (labels.get(cellKey(grid.rows - 1, c)) !== null)
      segs.push({ x1: PADDING + c * CELL_SIZE, y1: PADDING + grid.rows * CELL_SIZE, x2: PADDING + (c + 1) * CELL_SIZE, y2: PADDING + grid.rows * CELL_SIZE })
  }
  for (let r = 0; r < grid.rows; r++) {
    if (labels.get(cellKey(r, 0)) !== null)
      segs.push({ x1: PADDING, y1: PADDING + r * CELL_SIZE, x2: PADDING, y2: PADDING + (r + 1) * CELL_SIZE })
    if (labels.get(cellKey(r, grid.cols - 1)) !== null)
      segs.push({ x1: PADDING + grid.cols * CELL_SIZE, y1: PADDING + r * CELL_SIZE, x2: PADDING + grid.cols * CELL_SIZE, y2: PADDING + (r + 1) * CELL_SIZE })
  }
  return segs
})
</script>

<template>
  <g
    class="grid-line-thin"
    :stroke-width="THIN_STROKE"
    stroke-linecap="square"
  >
    <line
      v-for="(s, i) in thinH"
      :key="`th-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
    />
    <line
      v-for="(s, i) in thinV"
      :key="`tv-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
    />
  </g>
  <g
    class="grid-line-box"
    :stroke-width="BOX_STROKE"
    stroke-linecap="square"
  >
    <line
      v-for="(s, i) in thickH"
      :key="`bh-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
    />
    <line
      v-for="(s, i) in thickV"
      :key="`bv-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
    />
  </g>
  <g
    class="grid-line-box"
    :stroke-width="OUTER_STROKE"
    stroke-linecap="square"
  >
    <line
      v-for="(s, i) in outerH"
      :key="`oh-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
    />
    <line
      v-for="(s, i) in outerV"
      :key="`ov-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
    />
    <line
      v-for="(s, i) in puzzleEdge"
      :key="`pe-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
    />
  </g>
</template>

<style scoped>
/* Grid line colors come from theme tokens (default = today's hex). `stroke` is an inherited
   SVG property, so setting it on the group cascades to the child lines. Gated by Enable
   Custom Styles via the applier. */
.grid-line-thin { stroke: var(--color-grid-line-thin); }
.grid-line-box { stroke: var(--color-grid-line-box); }
</style>
