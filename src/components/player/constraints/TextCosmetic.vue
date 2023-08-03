<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Text } from '@/types'

const props = defineProps<{
  text: Text
  puzzle: Puzzle
}>()

const cellCoords = computed(() => {
  return props.text.cells.reduce(
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

const minMaxRowCol = computed(() => {
  return cellCoords.value.reduce(
    (minMax, coords) => ({
      minRow: Math.min(coords.row, minMax.minRow),
      minCol: Math.min(coords.col, minMax.minCol),
      maxRow: Math.max(coords.row, minMax.maxRow),
      maxCol: Math.max(coords.col, minMax.maxCol),
    }),
    {
      minRow: 100,
      minCol: 100,
      maxRow: -100,
      maxCol: -100,
    },
  )
})

const position = computed(() => {
  switch (cellCoords.value.length) {
    case 0:
      return { x: 0, y: 0 }
    case 1:
      return {
        x: (cellCoords.value[0].col * 100) + 50,
        y: (cellCoords.value[0].row * 100) + 50,
      }
  }

  const { maxRow, minRow, maxCol, minCol } = minMaxRowCol.value

  return {
    x: (maxCol + minCol + 1) * 50,
    y: (maxRow + minRow + 1) * 50,
  }
})

const dynamicStyle = computed(() => ({
  fontSize: `${props.text.size}em`,
  fill: props.text.fontC,
}))

const textTransform = computed(() => {
  const { x, y } = position.value
  const transform = [
    `translate(${x},${y})`
  ]

  if (props.text.angle) {
    transform.push(`rotate(${props.text.angle})`)
  }

  return transform
})

const throughGrid = computed(() => {
  const { maxRow, minRow, maxCol, minCol } = minMaxRowCol.value
  return {
    vertical: minCol !== maxCol,
    horizontal: minRow !== maxRow,
  }
})

const rectSize = computed(() => ({
  width: throughGrid.value.horizontal ? props.text.size * 40 : 4,
  height: throughGrid.value.vertical ? props.text.size * 60 : 4,
}))
</script>

<template lang="pug">
rect.background-rect(
  :x="position.x - (rectSize.width / 2)"
  :y="position.y - (rectSize.height / 2)"
  :width="rectSize.width"
  :height="rectSize.height"
)
text.cosmetic-text(
  x="0"
  y="0"
  :style="dynamicStyle"
  :transform="textTransform"
) {{ text.value }}
</template>

<style scoped lang="stylus">
.background-rect
  fill var(--color-background-soft)
  stroke var(--color-background-soft)
  opacity 0.5
.cosmetic-text
  stroke var(--color-background-soft)
  stroke-width 2
  paint-order stroke fill
  alignment-baseline central
  text-anchor middle
</style>
