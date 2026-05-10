<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import CosmeticLineComp from '@/components/cosmetics/CosmeticLine.vue'
import { cellsToPath } from '@/utils/linePath'
import { DEFAULT_LINE_STYLE } from '@/types/constraints'
import type { CosmeticLineData, LineStyle } from '@/types/constraints'

const editor = useEditorStore()

interface ResolvedLine {
  id: string
  cells: string[]
  style: LineStyle
}

const lineInstances = computed<ResolvedLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'cosmetic_line')
    .map(i => {
      const data = i.data as CosmeticLineData
      const style = editor.linePresets.find(p => p.id === data.presetId)?.style ?? DEFAULT_LINE_STYLE
      return { id: i.id, cells: data.cells, style }
    }),
)

const pendingPath = computed(() => cellsToPath(editor.pendingLineCells))
const activeStyle = computed(() => editor.activeLinePreset?.style ?? DEFAULT_LINE_STYLE)
</script>

<template>
  <g>
    <CosmeticLineComp
      v-for="inst in lineInstances"
      :key="inst.id"
      :cells="inst.cells"
      :line-style="inst.style"
    />
    <path
      v-if="pendingPath"
      :d="pendingPath"
      :stroke="activeStyle.color"
      :stroke-width="activeStyle.strokeWidth"
      :opacity="activeStyle.opacity * 0.55"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      pointer-events="none"
    />
  </g>
</template>
