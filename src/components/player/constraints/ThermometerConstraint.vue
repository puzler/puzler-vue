<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Thermometer } from '@/types'
import { addressToCoordinates } from '@/utils/grid-helpers';

const props = defineProps<{
  thermometer: Thermometer
  puzzle: Puzzle
}>()

const linePaths = computed(() => {
  return props.thermometer.lines.reduce(
    (list, line) => {
      if (line.length <= 1) return list

      const coordinates = line.map((address) => addressToCoordinates(address))
      const [start, ...rest] = coordinates

      const pathData = [
        `M${(start.col * 100) + 50} ${(start.row * 100) + 50}`,
        ...rest.map(({ row, col }) => `L${(col * 100) + 50} ${(row * 100) + 50}`)
      ]

      const secondToLast = coordinates[line.length - 2]
      const last = coordinates[line.length - 1]

      const modifiers = {
        x: (secondToLast?.col || last.col) - last.col,
        y: (secondToLast?.row || last.row) - last.row,
      }

      pathData[pathData.length - 1] = `L${(last.col * 100) + 50 + (modifiers.x * 12.5)} ${(last.row * 100) + 50 + (modifiers.y * 12.5)}`

      return [
        ...list,
        { pathData },
      ]
    },
    [] as Array<{ pathData: Array<string> }>,
  )
})

const bulbPosition = computed(() => {
  const coords = addressToCoordinates(props.thermometer.bulb)
  return {
    x: coords.col * 100 + 50,
    y: coords.row * 100 + 50,
  }
})

</script>

<template lang="pug">
path.thermo-line(
  v-for="line, i in linePaths"
  :key="'thermo-line-' + i"
  :d="line.pathData"
)
circle.thermo-bulb(
  :cx="bulbPosition.x"
  :cy="bulbPosition.y"
)
</template>

<style scoped lang="stylus">
.thermo-line
  stroke-width 25
  stroke #bbbbbb
  stroke-linecap round
  stroke-linejoin round
  fill none
.thermo-bulb
  r 40
  fill #bbbbbb
</style>
