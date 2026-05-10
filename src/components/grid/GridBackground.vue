<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING, THIN_STROKE, BOX_STROKE, OUTER_STROKE, cellKey } from '@/composables/useGrid'

const grid = useGridStore()

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

const thinHSegs = computed<Segment[]>(() => {
  const segs: Segment[] = []
  for (let r = 1; r < grid.rows; r++) {
    const y = PADDING + r * CELL_SIZE
    for (let c = 0; c < grid.cols; c++) {
      if (grid.regionBorderType(cellKey(r - 1, c), cellKey(r, c)) !== 'thin') continue
      segs.push({ x1: PADDING + c * CELL_SIZE, y1: y, x2: PADDING + (c + 1) * CELL_SIZE, y2: y })
    }
  }
  return segs
})

const thickHSegs = computed<Segment[]>(() => {
  const segs: Segment[] = []
  for (let r = 1; r < grid.rows; r++) {
    const y = PADDING + r * CELL_SIZE
    for (let c = 0; c < grid.cols; c++) {
      if (grid.regionBorderType(cellKey(r - 1, c), cellKey(r, c)) !== 'thick') continue
      segs.push({ x1: PADDING + c * CELL_SIZE, y1: y, x2: PADDING + (c + 1) * CELL_SIZE, y2: y })
    }
  }
  return segs
})

const thinVSegs = computed<Segment[]>(() => {
  const segs: Segment[] = []
  for (let c = 1; c < grid.cols; c++) {
    const x = PADDING + c * CELL_SIZE
    for (let r = 0; r < grid.rows; r++) {
      if (grid.regionBorderType(cellKey(r, c - 1), cellKey(r, c)) !== 'thin') continue
      segs.push({ x1: x, y1: PADDING + r * CELL_SIZE, x2: x, y2: PADDING + (r + 1) * CELL_SIZE })
    }
  }
  return segs
})

const thickVSegs = computed<Segment[]>(() => {
  const segs: Segment[] = []
  for (let c = 1; c < grid.cols; c++) {
    const x = PADDING + c * CELL_SIZE
    for (let r = 0; r < grid.rows; r++) {
      if (grid.regionBorderType(cellKey(r, c - 1), cellKey(r, c)) !== 'thick') continue
      segs.push({ x1: x, y1: PADDING + r * CELL_SIZE, x2: x, y2: PADDING + (r + 1) * CELL_SIZE })
    }
  }
  return segs
})

const outerHSegs = computed<Segment[]>(() => {
  const segs: Segment[] = []
  for (let r = 1; r < grid.rows; r++) {
    const y = PADDING + r * CELL_SIZE
    for (let c = 0; c < grid.cols; c++) {
      if (grid.regionBorderType(cellKey(r - 1, c), cellKey(r, c)) !== 'outer') continue
      segs.push({ x1: PADDING + c * CELL_SIZE, y1: y, x2: PADDING + (c + 1) * CELL_SIZE, y2: y })
    }
  }
  return segs
})

const outerVSegs = computed<Segment[]>(() => {
  const segs: Segment[] = []
  for (let c = 1; c < grid.cols; c++) {
    const x = PADDING + c * CELL_SIZE
    for (let r = 0; r < grid.rows; r++) {
      if (grid.regionBorderType(cellKey(r, c - 1), cellKey(r, c)) !== 'outer') continue
      segs.push({ x1: x, y1: PADDING + r * CELL_SIZE, x2: x, y2: PADDING + (r + 1) * CELL_SIZE })
    }
  }
  return segs
})

// Outer puzzle edge — one segment per cell, skipped when the cell has a null region
const puzzleEdgeSegs = computed<Segment[]>(() => {
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

const totalW = computed(() => PADDING * 2 + grid.cols * CELL_SIZE)
const totalH = computed(() => PADDING * 2 + grid.rows * CELL_SIZE)

interface CellRect { x: number; y: number }

const activeCellRects = computed<CellRect[]>(() => {
  const rects: CellRect[] = []
  const labels = grid.cellRegionLabelMap
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (labels.get(cellKey(r, c)) !== null)
        rects.push({ x: PADDING + c * CELL_SIZE, y: PADDING + r * CELL_SIZE })
    }
  }
  return rects
})
</script>

<template>
  <g>
    <rect
      x="0"
      y="0"
      :width="totalW"
      :height="totalH"
      fill="#f0f0f0"
    />
    <rect
      v-for="(cell, i) in activeCellRects"
      :key="`cell-${i}`"
      :x="cell.x"
      :y="cell.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      fill="white"
    />
    <g
      stroke="#333"
      :stroke-width="THIN_STROKE"
      stroke-linecap="square"
    >
      <line
        v-for="(s, i) in thinHSegs"
        :key="`th-${i}`"
        :x1="s.x1"
        :y1="s.y1"
        :x2="s.x2"
        :y2="s.y2"
      />
      <line
        v-for="(s, i) in thinVSegs"
        :key="`tv-${i}`"
        :x1="s.x1"
        :y1="s.y1"
        :x2="s.x2"
        :y2="s.y2"
      />
    </g>
    <g
      stroke="#111"
      :stroke-width="BOX_STROKE"
      stroke-linecap="square"
    >
      <line
        v-for="(s, i) in thickHSegs"
        :key="`bh-${i}`"
        :x1="s.x1"
        :y1="s.y1"
        :x2="s.x2"
        :y2="s.y2"
      />
      <line
        v-for="(s, i) in thickVSegs"
        :key="`bv-${i}`"
        :x1="s.x1"
        :y1="s.y1"
        :x2="s.x2"
        :y2="s.y2"
      />
    </g>
    <g
      stroke="#111"
      :stroke-width="OUTER_STROKE"
      stroke-linecap="square"
    >
      <line
        v-for="(s, i) in outerHSegs"
        :key="`oh-${i}`"
        :x1="s.x1"
        :y1="s.y1"
        :x2="s.x2"
        :y2="s.y2"
      />
      <line
        v-for="(s, i) in outerVSegs"
        :key="`ov-${i}`"
        :x1="s.x1"
        :y1="s.y1"
        :x2="s.x2"
        :y2="s.y2"
      />
      <line
        v-for="(s, i) in puzzleEdgeSegs"
        :key="`pe-${i}`"
        :x1="s.x1"
        :y1="s.y1"
        :x2="s.x2"
        :y2="s.y2"
      />
    </g>
  </g>
</template>
