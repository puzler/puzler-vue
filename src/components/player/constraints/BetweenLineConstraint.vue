<script setup lang="ts">
import { computed } from 'vue'
import type { BetweenLine } from '@/graphql/generated/types'

const props = defineProps<{
  betweenLine: BetweenLine
}>()

const linePath = computed(() => {
  const [origin, ...rest] = props.betweenLine.points

  return [
    `M${origin.column * 100} ${origin.row * 100}`,
    ...rest.map(({ column, row }) => `L${column * 100} ${row * 100}`),
  ]
})

const bulbLocations = computed(() => {
  return [
    props.betweenLine.points[0],
    props.betweenLine.points[props.betweenLine.points.length - 1]
  ].map(
    ({ row, column }) => ({ x: column * 100, y: row * 100 }),
  )
})
</script>

<template lang="pug">
path.between-line(
  :d="linePath"
)
circle.between-line-bulb(
  v-for="{ x, y }, i in bulbLocations"
  :key="'between-line-bulb-' + i"
  :cx="x"
  :cy="y"
)
</template>

<style scoped lang="stylus">
.between-line
  stroke #bbbbbb
  stroke-width 5
  fill none
  stroke-linecap round
  stroke-linejoin round

.between-line-bulb
  r 40
  stroke #bbbbbb
  stroke-width 5
  fill #ffffff
</style>
