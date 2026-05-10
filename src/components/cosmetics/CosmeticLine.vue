<script setup lang="ts">
import { computed } from 'vue'
import { cellsToPath } from '@/utils/linePath'
import type { LineStyle } from '@/types/constraints'

const props = defineProps<{
  cells: string[]
  lineStyle: LineStyle
}>()

const path = computed(() => cellsToPath(props.cells))
</script>

<template>
  <path
    v-if="path"
    :d="path"
    :stroke="lineStyle.color"
    :stroke-width="lineStyle.strokeWidth"
    :opacity="lineStyle.opacity"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
</template>
