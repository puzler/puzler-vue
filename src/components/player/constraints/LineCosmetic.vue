<script setup lang="ts">
import { computed } from 'vue'
import type { CustomLine, Color } from '@/graphql/generated/types'

const props = defineProps<{
  line: CustomLine
}>()

const linePath = computed(() => {
  const [origin, ...rest] = props.line.points

  return [
    `M${origin.column * 100} ${origin.row * 100}`,
    ...rest.map(
      ({ column, row }) => `L${column * 100} ${row * 100}`,
    ),
  ].join(' ')
})

function colorToRGBA(color: Color) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.opacity})`
}
</script>

<template lang="pug">
path.custom-line(
  :d="linePath"
  :stroke="colorToRGBA(line.color)"
  :stroke-width="line.width * 50"
)
</template>

<style scoped lang="stylus">
.custom-line
  fill none
  stroke-linecap round
  stroke-linejoin round
</style>
