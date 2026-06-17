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
  // One entry per applied color, in order. null = a fully-transparent color
  // that still owns its wedge (painted as nothing) rather than being dropped.
  fills: (string | null)[]
}

const cells = computed<CellInfo[]>(() => {
  const out: CellInfo[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const state = props.cellStates?.[key]
      // Each applied color keeps its own slot (and thus its own wedge). Real
      // colors resolve to pastel rgba; fully-transparent ones resolve to null
      // and paint nothing while still reserving their slice. Only stale/unknown
      // keys (not in the palette) are dropped entirely.
      const fills = !state?.colors?.length
        ? []
        : state.colors.filter((k) => palette.hasColor(k)).map((k) => palette.fillForKey(k))
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
