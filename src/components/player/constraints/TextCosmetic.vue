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

  let minRow = cellCoords.value[0].row
  let maxRow = cellCoords.value[0].row
  let minCol = cellCoords.value[0].col
  let maxCol = cellCoords.value[0].col

  cellCoords.value.forEach(({ row, col }) => {
    if (row < minRow) minRow = row
    if (row > maxRow) maxRow = row
    if (col < minCol) minCol = col
    if (col > maxCol) maxCol = col
  })

  return {
    x: (maxRow + minRow + 1) * 50,
    y: (maxCol + minCol + 1) * 50
  }
})

const dynamicStyle = computed(() => ({
  fontSize: `${props.text.size * 0.6}em`,
  fill: props.text.fontC,
}))
</script>

<template lang="pug">
text.cosmetic-text(
  :x="position.x"
  :y="position.y"
  :style="dynamicStyle"
) {{ text.value }}
</template>

<style scoped lang="stylus">
.cosmetic-text
  alignment-baseline central
  text-anchor middle
</style>
