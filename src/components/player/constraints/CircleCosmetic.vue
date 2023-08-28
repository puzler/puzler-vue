<script setup lang="ts">
import { computed } from 'vue'
import type { Circle, Color } from '@/graphql/generated/types'

const props = defineProps<{
  circle: Circle
}>()

const centerPoint = computed(() => {
  return {
    x: props.circle.address.column * 100,
    y: props.circle.address.row * 100,
  }
})

function colorToRGBA(color: Color) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.opacity})`
}

const dynamicStyle = computed(() => {
  if (!props.circle.angle) return {}

  return {
    transform: `rotate(${props.circle.angle}deg)`
  }
})
</script>

<template lang="pug">
ellipse.cosmetic-circle(
  :cx="centerPoint.x"
  :cy="centerPoint.y"
  :rx="circle.width * 50"
  :ry="circle.height * 50"
  :fill="colorToRGBA(circle.fillColor)"
  :stroke="colorToRGBA(circle.outlineColor)"
  :style="dynamicStyle"
)
text.circle-text(
  v-if="!!circle.text"
  :x="centerPoint.x"
  :y="centerPoint.y"
  :font-size="Math.min(circle.width, circle.height) * 75"
  :style="dynamicStyle"
  :stroke="colorToRGBA(circle.textColor)"
  :fill="colorToRGBA(circle.textColor)"
) {{ circle.text }}
</template>

<style scoped lang="stylus">
.cosmetic-circle
  stroke-width 3
  paint-order stroke fill
  transform-box fill-box
  transform-origin center
  transition-property fill, stroke, rx, ry, transform
  transition-duration 0.25s
  transition-timing-function linear
.circle-text
  stroke-width 1
  paint-order stroke fill
  alignment-baseline central
  text-anchor middle
  transform-box fill-box
  transform-origin center
  transition-property fill, font-size, transform
  transition-duration 0.25s
  transition-timing-function linear
</style>
