<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'

const props = defineProps<{
  cell: string
  color: string
  opacity?: number
}>()

const pos = computed(() => {
  const m = props.cell.match(/r(\d+)c(\d+)/)!
  return {
    x: PADDING + parseInt(m[2]) * CELL_SIZE,
    y: PADDING + parseInt(m[1]) * CELL_SIZE,
  }
})
</script>

<template>
  <rect
    :x="pos.x"
    :y="pos.y"
    :width="CELL_SIZE"
    :height="CELL_SIZE"
    :fill="color"
    :opacity="opacity ?? 1"
    pointer-events="none"
  />
</template>
