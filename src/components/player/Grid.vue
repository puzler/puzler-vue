<script setup lang="ts">
import GridCell from './GridCell.vue'
import { computed } from 'vue';
import { Puzzle, Cell } from '../../types'

const { puzzle } = defineProps<{
  puzzle: Puzzle;
}>()

const emit = defineEmits(
  ['cell-click', 'cell-enter'],
)

const gridStyle = computed(() => ({
  gridTemplateRows: `repeat(${puzzle.size}, auto)`,
  fontSize: `${100 / puzzle.size}cqw`,
  '--selectedBorderWidth': `${10 / puzzle.size}cqw`,
}))
</script>

<template lang="pug">
.grid-container
  .grid(
    :style="gridStyle"
  )
    .row(
      v-for="row, r in puzzle.cells"
      :key="'grid-row-' + r"
      :style="{ gridTemplateColumns: `repeat(${puzzle.size}, auto)` }"
    )
      GridCell(
        v-for="cell in row"
        :key="'cell-' + cell.address"
        :cell="cell"
        v-on:mousedown="(event, cell) => emit('cell-click', event, cell)"
        v-on:mouseenter="(event, cell) => emit('cell-enter', event, cell)"
      )
</template>

<style scoped lang="stylus">
.grid-container
  height 100cqmin
  width 100cqmin
  max-height calc(79cqw - 20px)
  max-width calc(79cqw - 20px)
  display flex
  container-type inline-size
  user-select none
  touch-action none

  .grid
    display grid
    flex 1

    .row
      display grid

@media screen and (max-width: 900px)
  .grid-container
    max-height calc(60cqh - 20px)
    max-width calc(60cqh - 20px)
</style>
