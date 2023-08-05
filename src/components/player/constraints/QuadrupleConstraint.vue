<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Quadruple } from '@/types'
import { addressToCoordinates } from '@/utils/grid-helpers';

const props = defineProps<{
  quadruple: Quadruple
  puzzle: Puzzle
}>()

const centerPoint = computed(() => {
  const coords = props.quadruple.cells.map((address) => addressToCoordinates(address))

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

  return { x, y }
})

const textPlacements = computed(() => {
  switch (props.quadruple.values.length) {
    case 1: {
      return [{
        digit: props.quadruple.values[0],
        x: centerPoint.value.x,
        y: centerPoint.value.y,
      }]
    }
    case 2: {
      const evenSpace = 50 / 3
      return props.quadruple.values.map((digit, i) => ({
        digit,
        x: centerPoint.value.x - (evenSpace / 2) + (evenSpace * i),
        y: centerPoint.value.y,
      }))
    }
    case 3: {
      const evenSpace = 50 / 6
      return props.quadruple.values.map((digit, i) => {
        let { x, y } = centerPoint.value
        if (i <= 1) {
          x += (evenSpace * i * 2) - evenSpace
          y -= evenSpace
        } else {
          y += evenSpace
        }

        return { digit, x, y }
      })
    }
    case 4: {
      const evenSpace = 50 / 6
      const { x, y } = centerPoint.value
      return props.quadruple.values.map((digit, i) => ({
        digit,
        x: x - evenSpace + (evenSpace * (2 * (i % 2))),
        y: y - evenSpace + (evenSpace * (2 * Math.floor(i / 2))),
      }))
    }
  }

  return []
})

</script>

<template lang="pug">
circle.cosmetic-circle(
  :cx="centerPoint.x"
  :cy="centerPoint.y"
  :r="25"
  :style="{ fill: '#ffffff', stroke: '#000000' }"
)
text.quadruple-text(
  v-for="text, i in textPlacements"
  :key="'quadruple-placement-' + i"
  :x="text.x"
  :y="text.y"
) {{ text.digit }}
</template>

<style scoped lang="stylus">
.quadruple-text
  fill #000000
  alignment-baseline central
  text-anchor middle
  font-size 20px
</style>
