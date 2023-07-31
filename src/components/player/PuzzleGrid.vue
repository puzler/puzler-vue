<script setup lang="ts">
import GridCell from './GridCell.vue'
import { computed } from 'vue';
import { Puzzle, Timer } from '@/types'

const props = defineProps<{
  puzzle: Puzzle
  timer: Timer
}>()

const emit = defineEmits([
  'cell-click',
  'cell-enter',
  'play-puzzle',
])

const gridStyle = computed(() => ({
  gridTemplateRows: `repeat(${props.puzzle.size}, auto)`,
  fontSize: `${100 / props.puzzle.size}cqmin`,
  '--selectedBorderWidth': `${10 / props.puzzle.size}cqmin`,
}))
</script>

<template lang="pug">
.grid-container
  .grid(
    :style="gridStyle"
  )
    .row(
      v-for="row, r in props.puzzle.cells"
      :key="'grid-row-' + r"
      :style="{ gridTemplateColumns: `repeat(${puzzle.size}, auto)` }"
    )
      GridCell(
        v-for="cell in row"
        :key="'cell-' + cell.address"
        :cell="cell"
        :error="puzzle.errorAddresses.includes(cell.address)"
        v-on:mousedown="(event, cell) => emit('cell-click', event, cell)"
        v-on:mouseenter="(event, cell) => emit('cell-enter', event, cell)"
      )
    .grid-overlay(
      v-if="timer.paused"
      v-on:click="emit('play-puzzle')"
    )
      .overlay-details(v-on:click.stop)
        .puzzle-info
          .title {{ puzzle.title || 'No Title Given' }}
          .author(v-if="puzzle.author") By: {{ puzzle.author }}
          .rules
            span Rules
            .ruleset {{ puzzle.rules || 'No Rules Given' }}
        v-btn.play-btn(
          v-on:click="emit('play-puzzle')"
          :append-icon="'mdi-play'"
        ) {{ timer.milliseconds === 0 ? 'Play' : 'Resume' }}
</template>

<style scoped lang="stylus">
.grid-container
  height 100cqmin
  width 100cqmin
  padding 20px 0
  max-height calc(79cqw - 20px)
  max-width calc(79cqw - 20px)
  display flex
  user-select none
  touch-action none
  container-type inline-size

  .grid
    display grid
    position relative
    flex 1

    .row
      display grid

    .grid-overlay
      position absolute
      top -10px
      bottom -10px
      left -10px
      right -10px
      z-index 1
      backdrop-filter blur(10px)
      border 10px solid var(--color-background-soft)
      background-color rgba(0, 0, 0, 0.3)
      display flex
      align-items center
      justify-content center
      font-size 0.25em
      .overlay-details
        background-color var(--color-background-soft)
        width 60%
        border-radius 10px
        padding 20px
        display flex
        flex-direction column
        .title
          line-height 1
          font-size 1.25em
        .rules
          margin 10px 0
          .ruleset
            font-size 0.75em
            background-color #e2f0f6
            border-radius 5px
            padding 5px 10px
            min-height 15cqw
            max-height 25cqw
            overflow-y auto
            white-space pre-wrap

@media screen and (max-width: 900px)
  .grid-container
    max-height calc(60cqh - 20px)
    max-width calc(60cqh - 20px)
    padding 20px 20px 0
</style>
