<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'

const props = defineProps<{
  row: number
  col: number
  selected: boolean
  color?: string | null
}>()

const x = computed(() => PADDING + props.col * CELL_SIZE)
const y = computed(() => PADDING + props.row * CELL_SIZE)

const fill = computed(() => {
  if (props.selected) return 'rgba(59,130,246,0.35)'
  if (props.color) return props.color
  return 'transparent'
})
</script>

<template>
  <rect
    :x="x"
    :y="y"
    :width="CELL_SIZE"
    :height="CELL_SIZE"
    :fill="fill"
  />
</template>
