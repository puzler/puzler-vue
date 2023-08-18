<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Circle } from '@/types'
import { addressToCoordinates } from '@/utils/grid-helpers';

const props = defineProps<{
  circle: Circle
  puzzle: Puzzle
}>()

const centerPoint = computed(() => {
  const coords = props.circle.cells.map((address) => addressToCoordinates(address))

  const minMax = coords.reduce(
    (minMax, coordinate) => {
      return {
        row: {
          min: coordinate.row < minMax.row.min ? coordinate.row : minMax.row.min,
          max: coordinate.row > minMax.row.max ? coordinate.row : minMax.row.max,
        },
        col: {
          min: coordinate.col < minMax.col.min ? coordinate.col : minMax.col.min,
          max: coordinate.col > minMax.col.max ? coordinate.col : minMax.col.max,
        }
      }
    },
    {
      row: { min: 100, max: -100 },
      col: { min: 100, max: -100 },
    }
  )

  return {
    x: (minMax.col.min + minMax.col.max + 1) * 50,
    y: (minMax.row.min + minMax.row.max + 1) * 50,
  }
})

const circleStyle = computed(() => ({
  fill: props.circle.fill,
  stroke: props.circle.outline
}))

</script>

<template lang="pug">
ellipse.cosmetic-circle(
  :cx="centerPoint.x"
  :cy="centerPoint.y"
  :rx="circle.width * 50"
  :ry="circle.height * 50"
  :style="circleStyle"
)
</template>

<style scoped lang="stylus">
</style>
