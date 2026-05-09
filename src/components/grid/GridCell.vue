<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'

const props = defineProps<{
  row: number
  col: number
  color?: string | null
}>()

const x = computed(() => PADDING + props.col * CELL_SIZE)
const y = computed(() => PADDING + props.row * CELL_SIZE)
</script>

<template>
  <rect
    v-if="color"
    :x="x"
    :y="y"
    :width="CELL_SIZE"
    :height="CELL_SIZE"
    :fill="color"
  />
</template>
