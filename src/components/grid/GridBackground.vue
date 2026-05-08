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
      if (!grid.areSameBox(cellKey(r - 1, c), cellKey(r, c))) continue
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
      if (grid.areSameBox(cellKey(r - 1, c), cellKey(r, c))) continue
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
      if (!grid.areSameBox(cellKey(r, c - 1), cellKey(r, c))) continue
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
      if (grid.areSameBox(cellKey(r, c - 1), cellKey(r, c))) continue
      segs.push({ x1: x, y1: PADDING + r * CELL_SIZE, x2: x, y2: PADDING + (r + 1) * CELL_SIZE })
    }
  }
  return segs
})

const borderX = computed(() => PADDING)
const borderY = computed(() => PADDING)
const borderW = computed(() => grid.cols * CELL_SIZE)
const borderH = computed(() => grid.rows * CELL_SIZE)
</script>

<template>
  <g>
    <rect
      x="0"
      y="0"
      :width="borderX * 2 + borderW"
      :height="borderY * 2 + borderH"
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
    <rect
      :x="borderX"
      :y="borderY"
      :width="borderW"
      :height="borderH"
      fill="none"
      stroke="#111"
      :stroke-width="OUTER_STROKE"
    />
  </g>
</template>
