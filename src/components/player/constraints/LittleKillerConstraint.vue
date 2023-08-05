<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { LittleKiller } from '@/types'
import { addressToCoordinates } from '@/utils/grid-helpers';

const props = defineProps<{
  littleKiller: LittleKiller
  puzzle: Puzzle
}>()

const centerPoint = computed(() => {
  const { row, col } = addressToCoordinates(props.littleKiller.cell)

  return {
    x: col * 100 + 50,
    y: row * 100 + 50,
  }
})

const arrowPath = computed(() => {
  const bottom = props.littleKiller.direction.includes('D')
  const right = props.littleKiller.direction.includes('R')

  const arrowPoint = {
    x: centerPoint.value.x + (right ? 46 : -46),
    y: centerPoint.value.y + (bottom ? 46 : -46),
  }

  return [
    `M${arrowPoint.x} ${arrowPoint.y}`,
    `h${right ? -15 : 15}`,
    `M${arrowPoint.x} ${arrowPoint.y}`,
    `v${bottom ? -15 : 15}`,
    `M${arrowPoint.x} ${arrowPoint.y}`,
    `L${arrowPoint.x - (right ? 15 : -15)} ${arrowPoint.y - (bottom ? 15 : -15)}`
  ]
})
</script>

<template lang="pug">
path.little-killer-arrow(
  :d="arrowPath"
)
text.little-killer-value(
  :x="centerPoint.x"
  :y="centerPoint.y"
) {{ littleKiller.value }}
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
