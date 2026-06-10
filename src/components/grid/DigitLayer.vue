<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, cellKey } from '@/composables/useGrid'
import type { CellState } from '@/types/grid'

const props = defineProps<{
  givenDigits: Record<string, number>
  cellStates?: Record<string, CellState>
}>()

const grid = useGridStore()
const editor = useEditorStore()

const MARK_FONT = 11
const MARK_PAD = 5

// Slots listed in activation priority order (fewest marks uses first slots).
// readOrder controls digit assignment: top-left → top-right, row by row.
const MARK_SLOTS = [
  { readOrder: 0, dx: MARK_PAD,              dy: MARK_PAD,              anchor: 'start',  baseline: 'hanging'  }, // top-left
  { readOrder: 2, dx: CELL_SIZE - MARK_PAD,  dy: MARK_PAD,              anchor: 'end',    baseline: 'hanging'  }, // top-right
  { readOrder: 6, dx: MARK_PAD,              dy: CELL_SIZE - MARK_PAD,  anchor: 'start',  baseline: 'auto'     }, // bottom-left
  { readOrder: 8, dx: CELL_SIZE - MARK_PAD,  dy: CELL_SIZE - MARK_PAD,  anchor: 'end',    baseline: 'auto'     }, // bottom-right
  { readOrder: 1, dx: CELL_SIZE / 2,         dy: MARK_PAD,              anchor: 'middle', baseline: 'hanging'  }, // top-middle
  { readOrder: 3, dx: MARK_PAD,              dy: CELL_SIZE / 2,         anchor: 'start',  baseline: 'central'  }, // left-middle
  { readOrder: 5, dx: CELL_SIZE - MARK_PAD,  dy: CELL_SIZE / 2,         anchor: 'end',    baseline: 'central'  }, // right-middle
  { readOrder: 7, dx: CELL_SIZE / 2,         dy: CELL_SIZE - MARK_PAD,  anchor: 'middle', baseline: 'auto'     }, // bottom-middle
  { readOrder: 4, dx: CELL_SIZE / 2,         dy: CELL_SIZE / 2,         anchor: 'middle', baseline: 'central'  }, // center
] as const

interface DigitEntry {
  key: string
  x: number
  y: number
  digit: number
  isGiven: boolean
}

interface CornerMarkEntry {
  key: string
  cell: string
  x: number
  y: number
  digit: number
  anchor: string
  baseline: string
}

interface CenterMarkEntry {
  key: string
  cell: string
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
      const digits = [...state.cornerMarks].sort((a, b) => a - b)
      const n = Math.min(digits.length, MARK_SLOTS.length)
      // Take the first n slots by priority, then sort them by reading order
      const active = MARK_SLOTS.slice(0, n)
        .map((slot) => ({ ...slot }))
        .sort((a, b) => a.readOrder - b.readOrder)
      active.forEach((slot, i) => {
        out.push({
          key: `cm-${key}-${digits[i]}`,
          cell: key,
          x: cellX + slot.dx,
          y: cellY + slot.dy,
          digit: digits[i],
          anchor: slot.anchor,
          baseline: slot.baseline,
        })
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
      out.push({ key: `km-${key}`, cell: key, x: cx, y: cy, marks: state.centerMarks })
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
      font-family="'Space Grotesk', sans-serif"
      :fill="d.isGiven ? '#232B3D' : '#4F46E5'"
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
      :text-anchor="m.anchor"
      :dominant-baseline="m.baseline"
      :font-size="MARK_FONT"
      font-family="'Space Grotesk', sans-serif"
      :fill="editor.seenDigitsByCell.get(m.cell)?.has(m.digit) ? '#dc2626' : '#4F46E5'"
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
      font-family="'Space Grotesk', sans-serif"
    >
      <tspan
        v-for="d in m.marks"
        :key="d"
        :fill="editor.seenDigitsByCell.get(m.cell)?.has(d) ? '#dc2626' : '#4F46E5'"
      >
        {{ d }}
      </tspan>
    </text>
  </g>
</template>
