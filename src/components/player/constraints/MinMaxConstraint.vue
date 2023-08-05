<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import type { MinMaxCell } from '@/types'
import CellBackgroundColor from './CellBackgroundColor.vue'

const props = defineProps<{
  minMaxCell: MinMaxCell
  puzzle: Puzzle
  type: 'maximum'|'minimum'
}>()

const minimum = computed(() => props.type === 'minimum')

const indicatorPaths = computed(() => {
  let { col, row } = { ...props.minMaxCell }

  const centerPoint = {
    x: col * 100 + 50,
    y: row * 100 + 50,
  }
  const indicatorDepth = 5

  const paths = []
  if (props.minMaxCell.left) {
    let midPoint = {
      x: centerPoint.x - 44,
      y: centerPoint.y,
    }
    if (minimum.value) midPoint.x += indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - (indicatorDepth * (minimum.value ? 1 : -1))} ${midPoint.y - 12.5}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - (indicatorDepth * (minimum.value ? 1 : -1))} ${midPoint.y + 12.5}`,
    ])
  }
  
  if (props.minMaxCell.right) {
    let midPoint = {
      x: centerPoint.x + 44,
      y: centerPoint.y,
    }
    if (minimum.value) midPoint.x -= indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + (indicatorDepth * (minimum.value ? 1 : -1))} ${midPoint.y - 12.5}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + (indicatorDepth * (minimum.value ? 1 : -1))} ${midPoint.y + 12.5}`,
    ])
  }

  if (props.minMaxCell.top) {
    let midPoint = {
      x: centerPoint.x,
      y: centerPoint.y - 44,
    }
    if (minimum.value) midPoint.y += indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - 12.5} ${midPoint.y - (indicatorDepth * (minimum.value ? 1 : -1))}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + 12.5} ${midPoint.y - (indicatorDepth * (minimum.value ? 1 : -1))}`,
    ])
  }

  if (props.minMaxCell.bottom) {
    let midPoint = {
      x: centerPoint.x,
      y: centerPoint.y + 44,
    }
    if (minimum.value) midPoint.y -= indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - 12.5} ${midPoint.y + (indicatorDepth * (minimum.value ? 1 : -1))}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + 12.5} ${midPoint.y + (indicatorDepth * (minimum.value ? 1 : -1))}`,
    ])
  }

  return paths
})

const address = computed(() => `R${props.minMaxCell.row}C${props.minMaxCell.col}`)
</script>

<template lang="pug">
CellBackgroundColor(
  :address="address"
  :puzzle="puzzle"
  color="#dddddd"
)
path.min-max-indicator-border(
  v-for="pathData, i in indicatorPaths"
  :key="`min-max-indicator-border-${i}`"
  :d="pathData"
)
path.min-max-indicator(
  v-for="pathData, i in indicatorPaths"
  :key="`min-max-indicator-${i}`"
  :d="pathData"
)
</template>

<style scoped lang="stylus">
.min-max-indicator
  stroke #333333
  stroke-width 4
  stroke-linecap round
  stroke-linejoin round
.min-max-indicator-border
  stroke #ffffff
  stroke-width 6
  stroke-linecap round
  stroke-linejoin round
</style>
