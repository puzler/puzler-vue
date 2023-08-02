<script setup lang="ts">
import GridCell from './GridCell.vue'
import KillerCage from './constraints/KillerCage.vue'
import TextCosmetic from './constraints/TextCosmetic.vue'
import LineCosmetic from './constraints/LineCosmetic.vue'
import CircleCosmetic from './constraints/CircleCosmetic.vue'
import QuadrupleConstraint from './constraints/QuadrupleConstraint.vue'
import { computed } from 'vue';
import { Puzzle, Timer } from '@/types'

const props = defineProps<{
  puzzle: Puzzle
  timer: Timer
}>()

const emit = defineEmits([
  'cell-double--click',
  'cell-click',
  'cell-enter',
  'play-puzzle',
])

const effectiveSize = computed(() => {
  if (props.puzzle.hasOuterElements) return props.puzzle.size + 2
  return props.puzzle.size
})
</script>

<template lang="pug">
.grid-container(:style="{ '--puzzleSize': effectiveSize }")
  svg.constraints.under-grid(
    :viewBox="`0 0 ${effectiveSize * 100} ${effectiveSize * 100}`"
  )
    LineCosmetic(
      v-for="line, i in puzzle.lines"
      :key="'line-' + i"
      :line="line"
      :puzzle="puzzle"
    )
  .grid
    .top-spacer.row(v-if="puzzle.hasOuterElements")
    .row(
      v-for="row, r in props.puzzle.cells"
      :key="'grid-row-' + r"
    )
      .left-spacer(v-if="puzzle.hasOuterElements")
      GridCell(
        v-for="cell in row"
        :key="'cell-' + cell.address"
        :cell="cell"
        :error="puzzle.errorAddresses.includes(cell.address)"
        v-on:double-click="(event, cell) => emit('cell-double-click', event, cell)"
        v-on:mousedown="(event, cell) => emit('cell-click', event, cell)"
        v-on:mouseenter="(event, cell) => emit('cell-enter', event, cell)"
      )
      .right-spacer(v-if="puzzle.hasOuterElements")
    .bottom-spacer.row(v-if="puzzle.hasOuterElements")
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
  svg.constraints.over-grid(
    :viewBox="`0 0 ${effectiveSize * 100} ${effectiveSize * 100}`"
  )
    CircleCosmetic(
      v-for="circle, i in puzzle.circles"
      :key="'circle-' + i"
      :circle="circle"
      :puzzle="puzzle"
    )
    TextCosmetic(
      v-for="text, i in puzzle.text"
      :key="'text-' + i"
      :text="text"
      :puzzle="puzzle"
    )
    KillerCage(
      v-for="cage, i in puzzle.cages"
      :key="'cage-' + i"
      :cage="cage"
      :puzzle="puzzle"
    )
    QuadrupleConstraint(
      v-for="quadruple, i in puzzle.quadruples"
      :key="'quadruple-' + i"
      :quadruple="quadruple"
      :puzzle="puzzle"
    )
</template>

<style scoped lang="stylus">
.grid-container
  position relative
  height 100cqmin
  width 100cqmin
  max-height calc(79cqw - 20px)
  max-width calc(79cqw - 20px)
  display flex
  user-select none
  touch-action none
  container-type inline-size
  --cell-color-z 0
  --under-grid-z 1
  --grid-z 2
  --over-grid-z 3
  --overlay-z 4

  svg.constraints
    position absolute
    pointer-events none
    vector-effect non-scaling-stroke
    width 100%
    height 100%
    font-size 100px
    &.under-grid
      z-index var(--under-grid-z)
    &.over-grid
      z-index var(--over-grid-z)

  .grid
    display grid
    position relative
    font-size calc(100cqw / var(--puzzleSize))
    flex 1
    grid-template-rows repeat(var(--puzzleSize), auto)
    --selectedBorderWidth calc(10cqmin / var(--puzzleSize))

    .row
      display grid
      grid-template-columns repeat(var(--puzzleSize), auto)

    .grid-overlay
      position absolute
      top -10px
      bottom -10px
      left -10px
      right -10px
      z-index var(--overlay-z)
      backdrop-filter blur(10px)
      border 10px solid var(--color-background-soft)
      background-color rgba(0, 0, 0, 0.3)
      display flex
      align-items center
      justify-content center
      font-size 3cqw
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
    .grid
      .grid-overlay
        .overlay-details
          width 95%
          font-size 2em
          padding 10px
          .rules
            .ruleset
              max-height 40cqw
              font-size 0.8em
</style>
