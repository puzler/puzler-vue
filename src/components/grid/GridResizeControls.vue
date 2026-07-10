<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { resizePuzzleGrid, GRID_MIN, GRID_MAX, type ApplyResult } from '@/utils/puzzleJson'
import type { ResizeSide } from '@/utils/resizeDocument'

// On-canvas +/- pairs just outside each grid edge while the Grid tool is
// active: add or remove a row/column on that side. Each click is one undoable
// document swap (see resizePuzzleGrid).
const editor = useEditorStore()
const grid = useGridStore()

const BUTTON = 22
const GAP = 6

interface Control {
  side: ResizeSide
  op: 1 | -1
  x: number
  y: number
  disabled: boolean
}

const controls = computed<Control[]>(() => {
  const w = grid.cols * CELL_SIZE
  const h = grid.rows * CELL_SIZE
  const midX = PADDING + w / 2
  const midY = PADDING + h / 2
  const offset = CELL_SIZE / 2
  const place = (side: ResizeSide, op: 1 | -1, x: number, y: number): Control => {
    const axis = side === 'top' || side === 'bottom' ? grid.rows : grid.cols
    return { side, op, x, y, disabled: op === 1 ? axis >= GRID_MAX : axis <= GRID_MIN }
  }
  return [
    place('top', 1, midX - BUTTON / 2 - GAP, PADDING - offset),
    place('top', -1, midX + BUTTON / 2 + GAP, PADDING - offset),
    place('bottom', 1, midX - BUTTON / 2 - GAP, PADDING + h + offset),
    place('bottom', -1, midX + BUTTON / 2 + GAP, PADDING + h + offset),
    place('left', 1, PADDING - offset, midY - BUTTON / 2 - GAP),
    place('left', -1, PADDING - offset, midY + BUTTON / 2 + GAP),
    place('right', 1, PADDING + w + offset, midY - BUTTON / 2 - GAP),
    place('right', -1, PADDING + w + offset, midY + BUTTON / 2 + GAP),
  ]
})

function click(control: Control) {
  if (control.disabled) return
  const result: ApplyResult = resizePuzzleGrid(editor, grid, control.side, control.op)
  if (!result.ok) console.warn('Grid resize refused:', result.error)
}
</script>

<template>
  <g class="grid-resize-controls">
    <g
      v-for="c in controls"
      :key="`${c.side}-${c.op}`"
      :transform="`translate(${c.x}, ${c.y})`"
      :opacity="c.disabled ? 0.3 : 1"
      :style="{ cursor: c.disabled ? 'not-allowed' : 'pointer' }"
      @pointerdown.stop
      @click.stop="click(c)"
    >
      <title>{{ c.op === 1 ? 'Add' : 'Remove' }} {{ c.side === 'top' || c.side === 'bottom' ? 'row' : 'column' }} ({{ c.side }})</title>
      <circle
        r="11"
        class="resize-button"
      />
      <path
        :d="c.op === 1 ? 'M -5 0 H 5 M 0 -5 V 5' : 'M -5 0 H 5'"
        class="resize-glyph"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
      />
    </g>
  </g>
</template>

<style scoped>
.resize-button {
  fill: var(--color-paper, #faf7f0);
  stroke: var(--color-grid-line-box, #232b3d);
  stroke-width: 1.5;
}
.resize-glyph {
  stroke: var(--color-grid-line-box, #232b3d);
}
.grid-resize-controls g:hover:not([opacity='0.3']) .resize-button {
  fill: var(--color-action-tint, #eceafc);
}
</style>
