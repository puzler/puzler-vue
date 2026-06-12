<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { computeInsetOutlinePaths } from '@/utils/insetOutline'
import type { CloneData } from '@/types/constraints'

// While the clone tool is active, original groups get an inset violet
// outline so the user can tell originals from copies

const editor = useEditorStore()

const ORIGINAL_OUTLINE_COLOR = '#8B5CF6'
const OUTLINE_INSET = 3

const originalOutlines = computed<string[]>(() => {
  if (editor.activeTool !== 'clone') return []
  return editor.cosmeticInstances
    .filter(i => i.type === 'clone')
    .flatMap(i => computeInsetOutlinePaths(
      new Set((i.data as CloneData).cells),
      { edgeInset: () => OUTLINE_INSET, cornerRadius: 2 },
    ))
})
</script>

<template>
  <g pointer-events="none">
    <path
      v-for="(p, i) in originalOutlines"
      :key="i"
      :d="p"
      fill="none"
      :stroke="ORIGINAL_OUTLINE_COLOR"
      stroke-width="2.5"
      stroke-opacity="0.85"
      stroke-linejoin="round"
    />
  </g>
</template>
