<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { useSolverStore } from '@/stores/solver'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { CELL_SIZE, PADDING, cellKey } from '@/composables/useGrid'
import type { CellState } from '@/types/grid'

const props = defineProps<{
  givenDigits: Record<string, number>
  cellStates?: Record<string, CellState>
}>()

const grid = useGridStore()
const editor = useEditorStore()
const solver = useSolverStore()
const player = usePlayerSettingsStore()

// Tinting pencil marks red when their digit is already "seen" is a player
// setting on the solver page; in the setter it always applies (authoring aid).
const showConflictMarks = computed(() => editor.mode !== 'solving' || player.settings.highlightConflictingPencilmarks)

// A pencil mark's colour: red when it conflicts with a seen digit (if enabled),
// otherwise the normal indigo. Shared by corner and (as a fallback) centre marks.
function seenMarkFill(cell: string, digit: number): string {
  return showConflictMarks.value && editor.seenDigitsByCell.get(cell)?.has(digit) ? MARK_SEEN : MARK_NORMAL
}

// Center-mark colours. When "show candidate counts" is on, a true candidate is
// tinted by how many solutions remain if placed — fewer remaining = closer to
// solving, so it stands out, while many-solution candidates recede to grey:
//   1 → green, 2–4 → bright blue, 5–10 → faded blue, >10 → grey.
// Otherwise the normal indigo / seen-red pencil-mark colours apply.
const MARK_NORMAL = 'var(--color-grid-pencil)'
const MARK_SEEN = 'var(--color-grid-pencil-seen)'
const COUNT_1 = '#15c24f'    // vivid green: unique completing digit (also bolded)
const COUNT_2_4 = '#2563eb'  // bright blue
const COUNT_5_10 = '#60a5fa' // faded blue
const COUNT_MANY = '#9ca3af' // grey: more than 10 solutions

function countFor(cell: string, digit: number): number | undefined {
  return solver.showCandidateCounts ? solver.candidateCounts[cell]?.[digit] : undefined
}

function centerMarkFill(cell: string, digit: number): string {
  // Logical-candidate diagnostic: irreducible-but-impossible candidates are red.
  if (solver.showLogicalCandidates && solver.redCandidates[cell]?.includes(digit)) return MARK_SEEN
  const count = countFor(cell, digit)
  if (count !== undefined) {
    if (count === 1) return COUNT_1
    if (count <= 4) return COUNT_2_4
    if (count <= 10) return COUNT_5_10
    return COUNT_MANY
  }
  return seenMarkFill(cell, digit)
}

// Bold the unique-completing candidate so it stands out clearly from the blues.
function centerMarkWeight(cell: string, digit: number): string {
  return countFor(cell, digit) === 1 ? '700' : '400'
}

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
      :class="d.isGiven ? 'digit-given' : 'digit-input'"
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
      :style="{ fill: seenMarkFill(m.cell, m.digit) }"
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
        :style="{ fill: centerMarkFill(m.cell, d) }"
        :font-weight="centerMarkWeight(m.cell, d)"
      >
        {{ d }}
      </tspan>
    </text>
  </g>
</template>

<style scoped>
/* Given vs entered digit colors from theme tokens (default = today's ink / indigo). Pencil-mark
   colors flow through MARK_NORMAL / MARK_SEEN (also tokens). Gated by Enable Custom Styles. */
.digit-given { fill: var(--color-grid-digit-given); }
.digit-input { fill: var(--color-grid-digit-input); }
</style>
