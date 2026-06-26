<script setup lang="ts">
// One collaborator's selection, drawn as a faded ring in their assigned color.
import { useSelectionPaths, SEL_STROKE } from '@/composables/useSelectionPaths'

const props = defineProps<{ cells: Set<string>; color: string }>()

const paths = useSelectionPaths(() => props.cells)
</script>

<template>
  <g>
    <path
      v-for="(d, i) in paths"
      :key="i"
      :d="d"
      fill="none"
      :stroke="color"
      :stroke-width="SEL_STROKE"
      stroke-opacity="0.6"
      stroke-linejoin="round"
    />
  </g>
</template>
