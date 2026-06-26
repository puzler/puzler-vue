<script setup lang="ts">
import { useSelectionPaths, SEL_STROKE } from '@/composables/useSelectionPaths'

const props = defineProps<{
  selection: Set<string>
}>()

const selectionPaths = useSelectionPaths(() => props.selection)
</script>

<template>
  <g v-if="selection.size > 0">
    <path
      v-for="(pathData, i) in selectionPaths"
      :key="i"
      :d="pathData"
      fill="none"
      class="grid-selection"
      :stroke-width="SEL_STROKE"
      stroke-opacity="0.85"
      stroke-linejoin="round"
    />
  </g>
</template>

<style scoped>
.grid-selection { stroke: var(--color-grid-selection); }
</style>
