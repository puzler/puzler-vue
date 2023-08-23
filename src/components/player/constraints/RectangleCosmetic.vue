<script setup lang="ts">
import { computed } from 'vue'
import type { Rectangle, Color } from '@/graphql/generated/types'

const props = defineProps<{
  rectangle: Rectangle
}>()

const centerPoint = computed(() => {
  return {
    x: props.rectangle.address.column * 100,
    y: props.rectangle.address.row * 100,
  }
})

function colorToRGBA(color: Color) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.opacity})`
}

const dynamicStyle = computed(() => {
  if (!props.rectangle.angle) return {}

  return {
    transform: `rotate(${props.rectangle.angle}deg)`
  }
})
</script>

<template lang="pug">
rect.cosmetic-rectangle(
  :x="centerPoint.x - (rectangle.width * 50)"
  :y="centerPoint.y - (rectangle.height * 50)"
  :width="rectangle.width * 100"
  :height="rectangle.height * 100"
  :fill="colorToRGBA(rectangle.fillColor)"
  :stroke="colorToRGBA(rectangle.outlineColor)"
  :style="dynamicStyle"
)
text.rectangle-text(
  v-if="!!rectangle.text"
  :x="centerPoint.x"
  :y="centerPoint.y"
  :font-size="Math.min(rectangle.width, rectangle.height) * 90"
  :style="dynamicStyle"
  :fill="colorToRGBA(rectangle.textColor)"
) {{ rectangle.text }}
</template>

<style scoped lang="stylus">
.cosmetic-rectangle
  stroke-width 3
  paint-order stroke fill
  transform-box fill-box
  transform-origin center
.rectangle-text
  stroke var(--color-background-soft)
  stroke-width 2
  paint-order stroke fill
  alignment-baseline central
  text-anchor middle
  transform-box fill-box
  transform-origin center
</style>
