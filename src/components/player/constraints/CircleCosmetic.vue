<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Circle } from '@/types'

const props = defineProps<{
  circle: Circle
  puzzle: Puzzle
}>()

const centerPoint = computed(() => {
  const coords = props.circle.cells.map((address) => {
    const match = address.match(/^R(-{0,1}\d+)C(-{0,1}\d+)$/)
    if (!match) return { row: 0, col: 0 }

    const [row, col] = [match[1], match[2]].map((n) => parseInt(n, 10))
    return { row, col }
  })

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

  let y = (minMax.row.min + minMax.row.max + 1) * 50
  let x = (minMax.col.min + minMax.col.max + 1) * 50

  if (!props.puzzle.hasOuterElements) {
    x -= 100
    y -= 100
  }

  return { x, y }
})

const circleStyle = computed(() => ({
  fill: props.circle.fill,
  stroke: props.circle.outline
}))

</script>

<template lang="pug">
circle.cosmetic-circle(
  :cx="centerPoint.x"
  :cy="centerPoint.y"
  :r="circle.width * 50"
  :style="circleStyle"
)
</template>

<style scoped lang="stylus">
</style>