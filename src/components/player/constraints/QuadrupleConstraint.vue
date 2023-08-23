<script setup lang="ts">
import { computed } from 'vue'
import type { Quadruple } from '@/graphql/generated/types'

const props = defineProps<{
  quadruple: Quadruple
}>()

const centerPoint = computed(() => ({
  x: props.quadruple.location.column * 100,
  y: props.quadruple.location.row * 100,
}))

const textPlacements = computed(() => {
  switch (props.quadruple.values.length) {
    case 1: {
      return [{
        digit: props.quadruple.values[0],
        x: centerPoint.value.x,
        y: centerPoint.value.y,
      }]
    }
    case 2: {
      const evenSpace = 50 / 3
      return props.quadruple.values.map((digit, i) => ({
        digit,
        x: centerPoint.value.x - (evenSpace / 2) + (evenSpace * i),
        y: centerPoint.value.y,
      }))
    }
    case 3: {
      const evenSpace = 50 / 6
      return props.quadruple.values.map((digit, i) => {
        let { x, y } = centerPoint.value
        if (i <= 1) {
          x += (evenSpace * i * 2) - evenSpace
          y -= evenSpace
        } else {
          y += evenSpace
        }

        return { digit, x, y }
      })
    }
    case 4: {
      const evenSpace = 50 / 6
      const { x, y } = centerPoint.value
      return props.quadruple.values.map((digit, i) => ({
        digit,
        x: x - evenSpace + (evenSpace * (2 * (i % 2))),
        y: y - evenSpace + (evenSpace * (2 * Math.floor(i / 2))),
      }))
    }
  }

  return []
})

</script>

<template lang="pug">
circle.cosmetic-circle(
  :cx="centerPoint.x"
  :cy="centerPoint.y"
  :r="25"
  :style="{ fill: '#ffffff', stroke: '#000000' }"
)
text.quadruple-text(
  v-for="text, i in textPlacements"
  :key="'quadruple-placement-' + i"
  :x="text.x"
  :y="text.y"
) {{ text.digit }}
</template>

<style scoped lang="stylus">
.quadruple-text
  fill #000000
  alignment-baseline central
  text-anchor middle
  font-size 20px
</style>
