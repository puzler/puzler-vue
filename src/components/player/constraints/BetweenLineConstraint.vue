<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { BetweenLine } from '@/types'

const props = defineProps<{
  betweenLine: BetweenLine
  puzzle: Puzzle
}>()

function addressToCoordinates(address: string) {
  const match = address.match(/^R(-{0,1}\d+)C(-{0,1}\d+)$/)
  if (!match) return { row: 0, col: 0 }

  let [row, col] = [match[1], match[2]].map((n) => parseInt(n, 10))
  if (!props.puzzle.hasOuterElements) {
    row -= 1
    col -= 1
  }

  return { row, col }
}

const bulbsXY = computed(() => {
  return props.betweenLine.bulbs.map((address) => {
    const coords = addressToCoordinates(address)
    return {
      x: (coords.col * 100) + 50,
      y: (coords.row * 100) + 50,
    }
  })
})

const lineData = computed(() => {
  return props.betweenLine.lines.map((line) => {
    const lineCoords = line.map((address) => addressToCoordinates(address))
    const [origin, ...rest] = lineCoords

    const pathData = [
      `M${(origin.col * 100) + 50} ${(origin.row * 100) + 50}`,
      ...rest.map(({ row, col }) => `L${(col * 100) + 50} ${(row * 100) + 50}`)
    ]

    return pathData
  })
})
</script>

<template lang="pug">
path.between-line(
  v-for="line, i in lineData"
  :key="'between-line-line-' + i"
  :d="line"
)
circle.between-line-bulb(
  v-for="{ x, y }, i in bulbsXY"
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
