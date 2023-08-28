<script setup lang="ts">
import { computed } from 'vue'
import type { Address, Color } from '@/graphql/generated/types'

const props = defineProps<{
  cell: Address
  colors: Array<Color>
}>()

const backgroundColor = {
  alpha: 1,
  red: 255,
  green: 255,
  blue: 255,
}

const convertToAlpha = (
  value: number,
  backgroundValue: number,
  originalAlpha: number,
  targetAlpha: number,
) => {
  if (targetAlpha === 0) return 0
  return -1 * (((1 - targetAlpha) * backgroundValue * backgroundColor.alpha - value * originalAlpha) / targetAlpha)
}

function transparentColor(color: Color) {
  console.log(color)
  const { red, green, blue, opacity } = color
  const minValue = Math.min(red, green, blue)
  const minAlpha = 1 - (minValue / 255)

  const converted = {
    alpha: minAlpha,
    red: convertToAlpha(
      red,
      backgroundColor.red,
      opacity,
      minAlpha,
    ),
    green: convertToAlpha(
      green,
      backgroundColor.green,
      opacity,
      minAlpha,
    ),
    blue: convertToAlpha(
      blue,
      backgroundColor.blue,
      opacity,
      minAlpha,
    ),
  }

  return `rgba(${converted.red}, ${converted.green}, ${converted.blue}, ${converted.alpha})`
}

const centerPoint = computed(() => ({
  x: props.cell.column * 100,
  y: props.cell.row * 100,
}))

const colorPaths = computed(() => {
  if (props.colors.length === 0) return []
  if (props.colors.length === 1) {
    return [{
      data: [
        `M${centerPoint.value.x - 50} ${centerPoint.value.y - 50}`,
        'h100',
        'v100',
        'h-100',
        'v-100',
      ],
      color: transparentColor(props.colors[0]),
    }]
  }

  const portionPerColor = 400 / props.colors.length
  const lineToValue = (raw: number) => {
    let val = (raw + 75) % 400
    if (val <= 100) return `L${centerPoint.value.x - 50 + val} ${centerPoint.value.y - 50}`
    if (val <= 200) return `L${centerPoint.value.x + 50} ${(centerPoint.value.y - 50) + (val - 100)}`
    if (val <= 300) return `L${(centerPoint.value.x + 50) - (val - 200)} ${centerPoint.value.y + 50}`
    return `L${centerPoint.value.x - 50} ${(centerPoint.value.y + 50) - (val - 300)}`
  }

  return props.colors.map((color, i) => {
    const data = [`M${centerPoint.value.x} ${centerPoint.value.y}`]
    const start = i * portionPerColor
    const end = start + portionPerColor

    let currentPoint = start
    while (currentPoint < end) {
      data.push(lineToValue(currentPoint))
      currentPoint += 100 - ((currentPoint + 75) % 100)
    }

    return {
      data: [...data, lineToValue(end), 'Z'],
      color: transparentColor(color),
    }
  })
})
</script>

<template lang="pug">
path.background-color(
  v-for="path, i in colorPaths"
  :key="i"
  :d="path.data"
  :fill="path.color"
)
</template>

<style scoped lang="stylus">
.background-color
  stroke none
</style>
