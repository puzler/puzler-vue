<script setup lang="ts">
import { computed } from 'vue'
import type { Address, Color } from '@/graphql/generated/types'

const props = defineProps<{
  cell: Address
  color: Color
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
) =>  -1 * (((1 - targetAlpha) * backgroundValue * backgroundColor.alpha - value * originalAlpha) / targetAlpha)

const transparentColor = computed(() => {
  const { red, green, blue, opacity } = props.color
  const minValue = Math.min(red, green, blue)
  const minAlpha = 1 - (minValue / 255)

  const color = {
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

  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`
})

const coordinates = computed(() => {
  return {
    x: props.cell.column * 100 - 50,
    y: props.cell.row * 100 - 50,
  }
})
</script>

<template lang="pug">
rect.background-color(
  :x="coordinates.x"
  :y="coordinates.y"
  :fill="transparentColor"
)
</template>

<style scoped lang="stylus">
.background-color
  width 100px
  height 100px
  stroke none
</style>
