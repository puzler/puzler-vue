<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, cellKey } from '@/composables/useGrid'

const grid = useGridStore()
const editor = useEditorStore()

const visible = computed(() => editor.activeTool === 'region')

const labels = computed(() => {
  if (!visible.value) return []
  const result: Array<{ key: string; x: number; y: number; label: string; isNull: boolean }> = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const regionLabel = grid.cellRegionLabelMap.get(key) ?? null
      result.push({
        key,
        x: PADDING + c * CELL_SIZE + CELL_SIZE / 2,
        y: PADDING + r * CELL_SIZE + CELL_SIZE / 2,
        label: regionLabel ?? '—',
        isNull: regionLabel === null,
      })
    }
  }
  return result
})
</script>

<template>
  <g v-if="visible" pointer-events="none">
    <text
      v-for="cell in labels"
      :key="cell.key"
      :x="cell.x"
      :y="cell.y"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="26"
      font-weight="600"
      :fill="cell.isNull ? '#ddd' : '#bbb'"
    >{{ cell.label }}</text>
  </g>
</template>
