<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Rectangle } from '@/types'

const props = defineProps<{
  rectangle: Rectangle
  puzzle: Puzzle
}>()

const cellCoords = computed(() => {
  return props.rectangle.cells.reduce(
    (coords, address) => {
      const match = address.match(/^R(-{0,1}\d+)C(-{0,1}\d+)$/)
      if (!match) return coords

      let [row, col] = [match[1], match[2]].map((n) => parseInt(n, 10))
      if (!props.puzzle.hasOuterElements) {
        row -= 1
        col -= 1
      }

      return [
        ...coords,
        { row, col },
      ]
    },
    [] as Array<{ row: number, col: number }>,
  )
})

const centerPoint = computed(() => {
  const {
    minRow,
    minCol,
    maxRow,
    maxCol
  } = cellCoords.value.reduce(
    (minMax, coords) => ({
      minRow: Math.min(minMax.minRow, coords.row),
      minCol: Math.min(minMax.minCol, coords.col),
      maxRow: Math.max(minMax.maxRow, coords.row),
      maxCol: Math.max(minMax.maxCol, coords.col),
    }),
    { minRow: 100, minCol: 100, maxRow: -100, maxCol: -100 },
  )

  return {
    x: (maxCol + minCol + 1) * 50,
    y: (maxRow + minRow + 1) * 50
  }
})

const dynamicStyle = computed(() => {
  const style = {
    fill: props.rectangle.fill,
    stroke: props.rectangle.outline,
  } as Record<string, string>

  if (props.rectangle.angle) {
    style.transform = `rotate(${props.rectangle.angle}deg)`
  }

  return style
})

</script>

<template lang="pug">
rect.cosmetic-rectangle(
  :x="centerPoint.x - (rectangle.width * 50)"
  :y="centerPoint.y - (rectangle.height * 50)"
  :width="rectangle.width * 100"
  :height="rectangle.height * 100"
  :style="dynamicStyle"
)
</template>

<style scoped lang="stylus">
.cosmetic-rectangle
  stroke-width 3
  paint-order stroke fill
  transform-box fill-box
  transform-origin center
</style>
