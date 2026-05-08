<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING, cellKey } from '@/composables/useGrid'
import type { CellState } from '@/types/grid'

const props = defineProps<{
  givenDigits: Record<string, number>
  cellStates?: Record<string, CellState>
}>()

const grid = useGridStore()

// Fixed corner mark positions for digits 1-9 within a cell.
// Each digit occupies a dedicated spot in a 3×3 sub-grid in the top portion of the cell.
const MARK_COLS = 3
const MARK_ROWS = 3
const MARK_FONT = 11
const MARK_PAD_X = 4
const MARK_PAD_Y = 12
const MARK_STEP_X = (CELL_SIZE - MARK_PAD_X * 2) / (MARK_COLS - 1)
const MARK_STEP_Y = (CELL_SIZE * 0.45) / (MARK_ROWS - 1)

function cornerMarkPos(digit: number, cellX: number, cellY: number): { x: number; y: number } {
  const idx = digit - 1
  const col = idx % MARK_COLS
  const row = Math.floor(idx / MARK_COLS)
  return {
    x: cellX + MARK_PAD_X + col * MARK_STEP_X,
    y: cellY + MARK_PAD_Y + row * MARK_STEP_Y,
  }
}

interface DigitEntry {
  key: string
  x: number
  y: number
  digit: number
  isGiven: boolean
}

interface CornerMarkEntry {
  key: string
  x: number
  y: number
  digit: number
}

interface CenterMarkEntry {
  key: string
  x: number
  y: number
  marks: number[]
}

const mainDigits = computed<DigitEntry[]>(() => {
  const out: DigitEntry[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const cx = PADDING + c * CELL_SIZE + CELL_SIZE / 2
      const cy = PADDING + r * CELL_SIZE + CELL_SIZE / 2
      if (props.givenDigits[key] !== undefined) {
        out.push({ key: `g-${key}`, x: cx, y: cy, digit: props.givenDigits[key], isGiven: true })
      } else if (props.cellStates?.[key]?.value != null) {
        out.push({ key: `e-${key}`, x: cx, y: cy, digit: props.cellStates[key].value!, isGiven: false })
      }
    }
  }
  return out
})

const cornerMarks = computed<CornerMarkEntry[]>(() => {
  if (!props.cellStates) return []
  const out: CornerMarkEntry[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const state = props.cellStates[key]
      if (!state?.cornerMarks.length || state.value != null || props.givenDigits[key] !== undefined) continue
      const cellX = PADDING + c * CELL_SIZE
      const cellY = PADDING + r * CELL_SIZE
      state.cornerMarks.forEach((d) => {
        const pos = cornerMarkPos(d, cellX, cellY)
        out.push({ key: `cm-${key}-${d}`, x: pos.x, y: pos.y, digit: d })
      })
    }
  }
  return out
})

const centerMarks = computed<CenterMarkEntry[]>(() => {
  if (!props.cellStates) return []
  const out: CenterMarkEntry[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const state = props.cellStates[key]
      if (!state?.centerMarks.length || state.value != null || props.givenDigits[key] !== undefined) continue
      const cx = PADDING + c * CELL_SIZE + CELL_SIZE / 2
      const cy = PADDING + r * CELL_SIZE + CELL_SIZE / 2
      out.push({ key: `km-${key}`, x: cx, y: cy, marks: state.centerMarks })
    }
  }
  return out
})
</script>

<template>
  <g>
    <!-- Main digits -->
    <text
      v-for="d in mainDigits"
      :key="d.key"
      :x="d.x"
      :y="d.y"
      text-anchor="middle"
      dominant-baseline="central"
      :font-size="CELL_SIZE * 0.6"
      font-family="sans-serif"
      :fill="d.isGiven ? '#111' : '#2563eb'"
      :font-weight="d.isGiven ? '700' : '400'"
    >
      {{ d.digit }}
    </text>

    <!-- Corner pencil marks -->
    <text
      v-for="m in cornerMarks"
      :key="m.key"
      :x="m.x"
      :y="m.y"
      text-anchor="middle"
      dominant-baseline="central"
      :font-size="MARK_FONT"
      font-family="sans-serif"
      fill="#2563eb"
    >
      {{ m.digit }}
    </text>

    <!-- Center pencil marks -->
    <text
      v-for="m in centerMarks"
      :key="m.key"
      :x="m.x"
      :y="m.y"
      text-anchor="middle"
      dominant-baseline="central"
      :font-size="MARK_FONT + 1"
      font-family="sans-serif"
      fill="#2563eb"
    >
      {{ m.marks.join('') }}
    </text>
  </g>
</template>
