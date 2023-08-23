<script setup lang="ts">
import { computed } from 'vue'
import { PuzzleSolve } from '@/types'
import type { Address } from '@/graphql/generated/types'
import CellBackgroundColor from './CellBackgroundColor.vue'

const props = defineProps<{
  cell: Address
  puzzle: PuzzleSolve
  type: 'maximum'|'minimum'
}>()

const arrows = computed(() => {
  const { row, column } = props.cell
  const { minCells, maxCells } = props.puzzle.puzzleData.localConstraints
  const group = props.type === 'minimum' ? minCells! : maxCells!

  return {
    left: column !== 0 && !group.some(
      ({ cell }) => cell.row === row && cell.column === column - 1,
    ),
    right: column !== props.puzzle.size - 1 && !group.some(
      ({ cell }) => cell.row === row && cell.column === column + 1,
    ),
    top: row !== 0 && !group.some(
      ({ cell }) => cell.column === column && cell.row === row - 1,
    ),
    bottom: row !== props.puzzle.size - 1 && !group.some(
      ({ cell }) => cell.column === column && cell.row === row + 1,
    ),
  }
})

const indicatorPaths = computed(() => {
  const { column, row } = props.cell
  const { left, right, top, bottom } = arrows.value
  const minimum = props.type === 'minimum'

  const centerPoint = {
    x: column * 100,
    y: row * 100,
  }
  const indicatorDepth = 5

  const paths = []
  if (left) {
    let midPoint = {
      x: centerPoint.x - 44,
      y: centerPoint.y,
    }
    if (minimum) midPoint.x += indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - (indicatorDepth * (minimum ? 1 : -1))} ${midPoint.y - 12.5}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - (indicatorDepth * (minimum ? 1 : -1))} ${midPoint.y + 12.5}`,
    ])
  }
  
  if (right) {
    let midPoint = {
      x: centerPoint.x + 44,
      y: centerPoint.y,
    }
    if (minimum) midPoint.x -= indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + (indicatorDepth * (minimum ? 1 : -1))} ${midPoint.y - 12.5}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + (indicatorDepth * (minimum ? 1 : -1))} ${midPoint.y + 12.5}`,
    ])
  }

  if (top) {
    let midPoint = {
      x: centerPoint.x,
      y: centerPoint.y - 44,
    }
    if (minimum) midPoint.y += indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - 12.5} ${midPoint.y - (indicatorDepth * (minimum ? 1 : -1))}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + 12.5} ${midPoint.y - (indicatorDepth * (minimum ? 1 : -1))}`,
    ])
  }

  if (bottom) {
    let midPoint = {
      x: centerPoint.x,
      y: centerPoint.y + 44,
    }
    if (minimum) midPoint.y -= indicatorDepth

    paths.push([
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x - 12.5} ${midPoint.y + (indicatorDepth * (minimum ? 1 : -1))}`,
      `M${midPoint.x} ${midPoint.y}`,
      `L${midPoint.x + 12.5} ${midPoint.y + (indicatorDepth * (minimum ? 1 : -1))}`,
    ])
  }

  return paths
})
</script>

<template lang="pug">
CellBackgroundColor(
  :cell="cell"
  :color="{ red: 221, green: 221, blue: 221, opacity: 1 }"
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
