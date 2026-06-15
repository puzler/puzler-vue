<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { cellKey } from '@/composables/useGrid'
import GridCell from './GridCell.vue'
import type { CellState } from '@/types/grid'

const props = defineProps<{
  selection?: Set<string>
  cellStates?: Record<string, CellState>
}>()

const grid = useGridStore()
const palette = useColorPaletteStore()

interface CellInfo {
  key: string
  row: number
  col: number
  color: string | null
  fills: string[]
}

const cells = computed<CellInfo[]>(() => {
  const out: CellInfo[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const state = props.cellStates?.[key]
      // Player colors resolve through the palette (pastel rgba); white/unknown
      // keys resolve to null and are dropped, so they paint nothing.
      const fills = !state?.colors?.length
        ? []
        : state.colors.map((k) => palette.fillForKey(k)).filter((f): f is string => f !== null)
      out.push({
        key,
        row: r,
        col: c,
        color: state?.color ?? null,
        fills,
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
      :color="cell.color"
      :fills="cell.fills"
    />
  </g>
</template>
