<script setup lang="ts">
import { computed } from 'vue'
import type { Color, Text } from '@/graphql/generated/types'

const props = defineProps<{
  text: Text
}>()

const centerPoint = computed(() => ({
  x: props.text.address.column * 100,
  y: props.text.address.row * 100,
}))

function colorToRGBA({ red, green, blue, opacity }: Color) {
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

const dynamicStyle = computed(() => {
  if (!props.text.angle) return {}

  return {
    transform: `rotate(${props.text.angle}deg)`
  }
})

const throughGrid = computed(() => ({
  horizontal: Math.round(props.text.address.row) !== props.text.address.row,
  vertical: Math.round(props.text.address.column) !== props.text.address.column,
}))

const rectSize = computed(() => ({
  width: throughGrid.value.horizontal ? props.text.size * 40 : 1,
  height: throughGrid.value.vertical ? props.text.size * 60 : 1,
}))

const centerOrMiddleClass = computed(() => {
  const { row } = props.text.address

  if (Math.round(row) === row) return 'central'
  return 'middle'
})
</script>

<template lang="pug">
rect.background-rect(
  :x="centerPoint.x - (rectSize.width / 2)"
  :y="centerPoint.y - (rectSize.height / 2)"
  :width="rectSize.width"
  :height="rectSize.height"
)
text.cosmetic-text(
  :x="centerPoint.x"
  :y="centerPoint.y"
  :fill="colorToRGBA(text.fontColor)"
  :font-size="text.size * 100"
  :style="dynamicStyle"
  :class="centerOrMiddleClass"
) {{ text.text || '_' }}
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
  dominant-baseline middle
  text-anchor middle
  transform-box fill-box
  transform-origin center
  &.central
    dominant-baseline central
  &.middle
    dominant-baseline middle
</style>
