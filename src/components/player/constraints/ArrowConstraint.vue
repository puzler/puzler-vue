<script setup lang="ts">
import { computed } from 'vue'
import type { Arrow } from '@/graphql/generated/types'

const props = defineProps<{
  arrow: Arrow
}>()

const bulbPath = computed(() => {
  const [origin, ...rest] = props.arrow.cells

  const pathData = [
    `M${origin.column * 100} ${origin.row * 100}`,
    ...rest.map(
      ({ row, column }) => `L${column * 100} ${row * 100}`,
    ),
  ]

  if (props.arrow.cells.length > 1) {
    const offsetFromOrigin = {
      row: Math.abs(origin.row - rest[rest.length - 1].row),
      col: Math.abs(origin.column - rest[rest.length - 1].column),
    }
  
    if (offsetFromOrigin.row + offsetFromOrigin.col === 1) {
      pathData.push('Z')
    }
  } else {
    pathData.push('l0 0')
  }

  return pathData.join(' ')
})

const linePaths = computed(() => {
  return props.arrow.lines.reduce(
    (paths, line) => {
      if (line.length <= 1) return paths

      const [origin, ...rest] = line

      const pathData = [
        `M${origin.column * 100} ${origin.row * 100}`,
        ...rest.map(
          ({ row, column }) => `L${column * 100} ${row * 100}`,
        ),
      ]

      const previous = line[line.length - 2]
      const last = line[line.length - 1]

      const horizontal = previous.column - last.column
      const vertical = previous.row - last.row

      const offset = (horizontal === 0 || vertical === 0) ? 8 : 5

      const lastXY = {
        x: (last.column * 100) + (horizontal * offset),
        y: (last.row * 100) + (vertical * offset),
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

      return [
        ...paths,
        pathData.join(' '),
      ]
    },
    [] as Array<string>,
  )
})
</script>

<template lang="pug">
path.arrow-line(
  v-for="path, i in linePaths"
  :key="'arrow-line-' + i"
  :d="path"
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
