<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import type { TextStyle } from '@/types/constraints'

const props = defineProps<{
  cell: string
  text: string
  textStyle: TextStyle
  opacity?: number
}>()

const center = computed(() => {
  const m = props.cell.match(/r(\d+)c(\d+)/)!
  return {
    x: PADDING + parseInt(m[2]) * CELL_SIZE + CELL_SIZE / 2,
    y: PADDING + parseInt(m[1]) * CELL_SIZE + CELL_SIZE / 2,
  }
})
</script>

<template>
  <text
    :x="center.x"
    :y="center.y"
    text-anchor="middle"
    dominant-baseline="central"
    :fill="textStyle.color"
    :font-size="textStyle.fontSize"
    :font-weight="textStyle.bold ? 'bold' : 'normal'"
    :opacity="opacity ?? 1"
    pointer-events="none"
  >{{ text }}</text>
</template>
