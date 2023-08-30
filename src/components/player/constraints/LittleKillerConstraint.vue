<script setup lang="ts">
import { computed } from 'vue'
import type { LittleKillerSum } from '@/graphql/generated/types'

const props = defineProps<{
  littleKiller: LittleKillerSum
}>()

const centerPoint = computed(() => {
  return {
    x: props.littleKiller.location.column * 100,
    y: props.littleKiller.location.row * 100,
  }
})

const arrowPath = computed(() => {
  const { top, left } = props.littleKiller.direction
  const arrowPoint = {
    x: centerPoint.value.x + (left ? -46 : 46),
    y: centerPoint.value.y + (top ? -46 : 46),
  }

  return [
    `M${arrowPoint.x} ${arrowPoint.y}`,
    `h${left ? 15 : -15}`,
    `M${arrowPoint.x} ${arrowPoint.y}`,
    `v${top ? 15 : -15}`,
    `M${arrowPoint.x} ${arrowPoint.y}`,
    `L${arrowPoint.x - (left ? -15 : 15)} ${arrowPoint.y - (top ? -15 : 15)}`
  ].join(' ')
})
</script>

<template lang="pug">
path.little-killer-arrow(
  :d="arrowPath"
)
text.little-killer-value(
  :x="centerPoint.x"
  :y="centerPoint.y"
) {{ littleKiller.value || '_' }}
</template>

<style scoped lang="stylus">
.little-killer-arrow
  stroke #000000
  stroke-width 5
  stroke-linecap round
  stroke-linejoin round
.little-killer-value
  font-size 55px
  fill #000000
  stroke var(--color-background-soft)
  stroke-width 2
  paint-order stroke fill
  alignment-baseline central
  text-anchor middle
</style>
