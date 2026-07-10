<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { computeInsetOutlinePaths } from '@/utils/insetOutline'

// Hidden houses: visible ONLY while the Grid or House tool is active, as
// translucent stroked outlines. Hue cycles and the inset varies per instance
// so overlapping (even coincident) houses stay distinguishable. The brush
// preview renders in the upcoming house's color.

const editor = useEditorStore()

const visible = computed(
  () => editor.mode === 'setting' && (editor.activeTool === 'grid' || editor.activeTool === 'house'),
)

const HOUSE_HUES = [215, 5, 145, 275, 35, 320]

function houseColor(index: number): string {
  return `hsl(${HOUSE_HUES[index % HOUSE_HUES.length]}, 70%, 45%)`
}

interface RenderedPath { key: string; d: string; color: string }

const housePaths = computed<RenderedPath[]>(() => {
  if (!visible.value) return []
  return editor.cosmeticInstances
    .filter((i) => i.type === 'house')
    .flatMap((inst, index) => {
      const cells = new Set(((inst.data as { cells?: string[] }).cells ?? []))
      // Vary the inset so coincident outlines nest instead of stacking.
      const inset = 5 + (index % 4) * 3
      return computeInsetOutlinePaths(cells, {
        edgeInset: () => inset,
        cornerRadius: 6,
      }).map((d, pathIndex) => ({ key: `${inst.id}-${pathIndex}`, d, color: houseColor(index) }))
    })
})

const pending = computed<string[]>(() => {
  if (!visible.value || editor.activeTool !== 'house' || !editor.pendingRegionBrushCells.length) return []
  return computeInsetOutlinePaths(new Set(editor.pendingRegionBrushCells), { edgeInset: () => 5, cornerRadius: 6 })
})

const pendingColor = computed(() =>
  houseColor(editor.cosmeticInstances.filter((i) => i.type === 'house').length),
)
</script>

<template>
  <g
    v-if="visible"
    pointer-events="none"
    fill="none"
    stroke-linejoin="round"
  >
    <path
      v-for="path in housePaths"
      :key="path.key"
      :d="path.d"
      :stroke="path.color"
      stroke-width="3"
      opacity="0.55"
    />
    <path
      v-for="(path, i) in pending"
      :key="`pending-${i}`"
      :d="path"
      :stroke="pendingColor"
      stroke-width="3"
      stroke-dasharray="6 4"
      opacity="0.7"
    />
  </g>
</template>
