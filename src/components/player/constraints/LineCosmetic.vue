<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { Line } from '@/types'
import { addressToCoordinates } from '@/utils/grid-helpers';

const props = defineProps<{
  line: Line
  puzzle: Puzzle
}>()

function xyForAddress(address: string) {
  const { row, col } = addressToCoordinates(address)

  let y = row * 100 + 50
  let x = col * 100 + 50

  return { x, y, forSvg: `${x} ${y}` }
}

const linesData = computed(() => {
  return props.line.lines.reduce(
    (segments, lineSegment) => {
      if (lineSegment.length === 0) return segments

      const segmentData = [`M${xyForAddress(lineSegment[0]).forSvg}`]
      lineSegment.slice(1).forEach((address) => {
        segmentData.push(`L${xyForAddress(address).forSvg}`)
      })

      return [
        ...segments,
        segmentData,
      ]
    },
    [] as Array<Array<string>>,
  )
})
</script>

<template lang="pug">
path.line-segment(
  v-for="segment, i in linesData"
  :key="`line-segment-${i}`"
  :d="segment"
  :stroke="line.color"
  :stroke-width="line.width * 50"
)
</template>

<style scoped lang="stylus">
.line-segment
  fill none
  stroke-linecap round
  stroke-linejoin round
</style>
