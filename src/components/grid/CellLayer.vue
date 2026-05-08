<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { cellKey } from '@/composables/useGrid'
import GridCell from './GridCell.vue'
import type { CellState } from '@/types/grid'

const props = defineProps<{
  selection: Set<string>
  cellStates?: Record<string, CellState>
}>()

const grid = useGridStore()

interface CellInfo {
  key: string
  row: number
  col: number
  selected: boolean
  color: string | null
}

const cells = computed<CellInfo[]>(() => {
  const out: CellInfo[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      out.push({
        key,
        row: r,
        col: c,
        selected: props.selection.has(key),
        color: props.cellStates?.[key]?.color ?? null,
      })
    }
  }
  return out
})
</script>

<template>
  <g>
    <GridCell
      v-for="cell in cells"
      :key="cell.key"
      :row="cell.row"
      :col="cell.col"
      :selected="cell.selected"
      :color="cell.color"
    />
  </g>
</template>
