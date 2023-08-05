<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Arrow } from '@/types'
import { addressToCoordinates } from '@/utils/grid-helpers'

const props = defineProps<{
  arrow: Arrow
  puzzle: Puzzle
}>()

const bulbPath = computed(() => {
  const bulbCoords = props.arrow.cells.map((address) => addressToCoordinates(address))
  const [origin, ...rest] = bulbCoords

  const pathData = [
    `M${(origin.col * 100) + 50} ${(origin.row * 100 + 50)}`,
    ...rest.map(({ row, col }) => `L${(col * 100) + 50} ${(row * 100) + 50}`),
  ]

  if (bulbCoords.length > 1) {
    const offsetFromOrigin = {
      row: Math.abs(origin.row - rest[rest.length - 1].row),
      col: Math.abs(origin.col - rest[rest.length - 1].col),
    }
  
    if (offsetFromOrigin.row + offsetFromOrigin.col === 1) {
      pathData.push('Z')
    }
  } else {
    pathData.push('l0 0')
  }

  return pathData
})

const linePaths = computed(() => {
  return props.arrow.lines.map((line) => {
    const lineCoords = line.map((address) => addressToCoordinates(address))
    const [origin, ...rest] = lineCoords

    const pathData = [
      `M${(origin.col * 100) + 50} ${(origin.row * 100) + 50}`,
      ...rest.map(({ row, col }) => `L${(col * 100) + 50} ${(row * 100) + 50}`),
    ]

    const previous = lineCoords[lineCoords.length - 2]
    const last = lineCoords[lineCoords.length - 1]

    const horizontal = previous.col - last.col
    const vertical = previous.row - last.row

    const offset = (horizontal === 0 || vertical === 0) ? 8 : 5

    const lastXY = {
      x: (last.col * 100) + 50 + (horizontal * offset),
      y: (last.row * 100) + 50 + (vertical * offset),
    }

    pathData[pathData.length - 1] = `L${lastXY.x} ${lastXY.y}`

    if (horizontal === 0) {
      pathData.push(`L${lastXY.x - 20} ${lastXY.y + (20 * vertical)}`)
      pathData.push(`M${lastXY.x} ${lastXY.y}`)
      pathData.push(`L${lastXY.x + 20} ${lastXY.y + (20 * vertical)}`)
    } else if (vertical === 0) {
      pathData.push(`L${lastXY.x + (20 * horizontal)} ${lastXY.y - 20}`)
      pathData.push(`M${lastXY.x} ${lastXY.y}`)
      pathData.push(`L${lastXY.x + (20 * horizontal)} ${lastXY.y + 20}`)
    } else {
      pathData.push(`h${horizontal * 28}`)
      pathData.push(`M${lastXY.x} ${lastXY.y}`)
      pathData.push(`v${vertical * 28}`)
    }

    return pathData
  })
})
</script>

<template lang="pug">
path.arrow-line(
  v-for="pathData, i in linePaths"
  :key="'arrow-line-' + i"
  :d="pathData"
)
path.arrow-bulb-border(:d="bulbPath")
path.arrow-bulb-inner(:d="bulbPath")
</template>

<style scoped lang="stylus">
.arrow-line
  stroke #d4d4d4
  stroke-width 8
  stroke-linecap round
  stroke-linejoin round
  fill none

.arrow-bulb-border
  stroke #bbbbbb
  stroke-width 85
  stroke-linecap round
  stroke-linejoin round
  fill none

.arrow-bulb-inner
  stroke #ffffff
  stroke-width 70
  stroke-linecap round
  stroke-linejoin round
  fill none
</style>
