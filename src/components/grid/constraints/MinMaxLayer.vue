<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, keyToRowCol } from '@/composables/useGrid'
import { useConstraintStyles } from '@/composables/useConstraintStyles'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Chevron stroke + legibility halo per type, resolved through the theme (default chevron
// #333333 over a white halo; once themed, the halo flips to stay legible). The cell-fill tint
// is drawn by GridBackground, not here.
const minStyle = computed(() => cs.minMaxStyle('minimums'))
const maxStyle = computed(() => cs.minMaxStyle('maximums'))

const MM_REACH  = CELL_SIZE * 0.44   // ~28
const MM_DEPTH  = CELL_SIZE * 0.05   // ~3
const MM_SPREAD = CELL_SIZE * 0.125  //  8

interface MinMaxPath { key: string; path: string }

type Side = 'top' | 'right' | 'bottom' | 'left'
const SIDES: Array<{ side: Side; dr: number; dc: number }> = [
  { side: 'top',    dr: -1, dc:  0 },
  { side: 'bottom', dr:  1, dc:  0 },
  { side: 'left',   dr:  0, dc: -1 },
  { side: 'right',  dr:  0, dc:  1 },
]

function minMaxChevronPath(cx: number, cy: number, side: Side, type: 'minimums' | 'maximums'): string {
  const midOffset = type === 'minimums' ? MM_REACH - MM_DEPTH : MM_REACH
  const tipOffset = type === 'minimums' ? MM_REACH              : MM_REACH - MM_DEPTH

  let apex: [number, number]
  let tip1: [number, number]
  let tip2: [number, number]

  if      (side === 'top')    { apex = [cx,            cy - midOffset]; tip1 = [cx - MM_SPREAD, cy - tipOffset]; tip2 = [cx + MM_SPREAD, cy - tipOffset] }
  else if (side === 'bottom') { apex = [cx,            cy + midOffset]; tip1 = [cx - MM_SPREAD, cy + tipOffset]; tip2 = [cx + MM_SPREAD, cy + tipOffset] }
  else if (side === 'left')   { apex = [cx - midOffset, cy           ]; tip1 = [cx - tipOffset, cy - MM_SPREAD]; tip2 = [cx - tipOffset, cy + MM_SPREAD] }
  else                        { apex = [cx + midOffset, cy           ]; tip1 = [cx + tipOffset, cy - MM_SPREAD]; tip2 = [cx + tipOffset, cy + MM_SPREAD] }

  return `M ${tip1[0]} ${tip1[1]} L ${apex[0]} ${apex[1]} L ${tip2[0]} ${tip2[1]}`
}

function computeMinMaxPaths(type: 'minimums' | 'maximums'): MinMaxPath[] {
  const marks = editor.singleCellMarks[type]
  if (!marks?.size) return []
  const result: MinMaxPath[] = []
  for (const key of marks) {
    const { row, col } = keyToRowCol(key)
    const cx = PADDING + col * CELL_SIZE + CELL_SIZE / 2
    const cy = PADDING + row * CELL_SIZE + CELL_SIZE / 2
    for (const { side, dr, dc } of SIDES) {
      if (marks.has(`r${row + dr}c${col + dc}`)) continue
      result.push({ key: `${type}-${key}-${side}`, path: minMaxChevronPath(cx, cy, side, type) })
    }
  }
  return result
}

const minimumPaths = computed<MinMaxPath[]>(() => computeMinMaxPaths('minimums'))
const maximumPaths = computed<MinMaxPath[]>(() => computeMinMaxPaths('maximums'))
</script>

<template>
  <g>
    <!-- White outline pass (both types together so outlines never cover dark strokes) -->
    <path
      v-for="ind in minimumPaths"
      :key="`${ind.key}-bg`"
      :d="ind.path"
      fill="none"
      :stroke="minStyle.halo"
      stroke-width="6"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
    <path
      v-for="ind in maximumPaths"
      :key="`${ind.key}-bg`"
      :d="ind.path"
      fill="none"
      :stroke="maxStyle.halo"
      stroke-width="6"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
    <!-- Dark pass -->
    <path
      v-for="ind in minimumPaths"
      :key="ind.key"
      :d="ind.path"
      fill="none"
      :stroke="minStyle.chevronColor"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
    <path
      v-for="ind in maximumPaths"
      :key="ind.key"
      :d="ind.path"
      fill="none"
      :stroke="maxStyle.chevronColor"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
  </g>
</template>
