<script setup lang="ts">
import { computed } from 'vue'
import type { Thermometer } from '@/graphql/generated/types'

const props = defineProps<{
  thermometer: Thermometer
}>()

const linePaths = computed(() => {
  return props.thermometer.lines.reduce(
    (list, line) => {
      if (line.length <= 1) return list

      const [start, ...rest] = line

      const pathData = [
        `M${start.column * 100} ${start.row * 100}`,
        ...rest.map(
          ({ row, column }) => `L${column * 100} ${row * 100}`,
        )
      ]

      const secondToLast = line[line.length - 2]
      const last = line[line.length - 1]

      const modifiers = {
        x: (secondToLast?.column || last.column) - last.column,
        y: (secondToLast?.row || last.row) - last.row,
      }

      pathData[pathData.length - 1] = `L${(last.column * 100) + (modifiers.x * 12.5)} ${(last.row * 100) + (modifiers.y * 12.5)}`

      return [
        ...list,
        pathData.join(' '),
      ]
    },
    [] as Array<string>,
  )
})

const bulbPosition = computed(() => {
  const { row, column } = props.thermometer.bulb
  return {
    x: column * 100,
    y: row * 100,
  }
})

</script>

<template lang="pug">
path.thermo-line(
  v-for="path, i in linePaths"
  :key="'thermo-line-' + i"
  :d="path"
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
