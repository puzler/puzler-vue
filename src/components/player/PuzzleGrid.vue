<script setup lang="ts">
import GridCell from './GridCell.vue'
import KillerCage from './constraints/KillerCage.vue'
import CellBackgroundColor from './constraints/CellBackgroundColor.vue'
import TextCosmetic from './constraints/TextCosmetic.vue'
import LineCosmetic from './constraints/LineCosmetic.vue'
import CircleCosmetic from './constraints/CircleCosmetic.vue'
import RectangleCosmetic from './constraints/RectangleCosmetic.vue'
import ArrowConstraint from './constraints/ArrowConstraint.vue'
import MinMaxConstraint from './constraints/MinMaxConstraint.vue'
import BetweenLineConstraint from './constraints/BetweenLineConstraint.vue'
import QuadrupleConstraint from './constraints/QuadrupleConstraint.vue'
import LittleKillerConstraint from './constraints/LittleKillerConstraint.vue'
import ThermometerConstraint from './constraints/ThermometerConstraint.vue'
import { computed } from 'vue';
import {
  Timer,
  PuzzleSolve,
} from '@/types'
import type {
  CosmeticShape,
  Text,
} from '@/graphql/generated/types'

const props = defineProps<{
  puzzle: PuzzleSolve
  timer: Timer
}>()

const emit = defineEmits([
  'cell-double-click',
  'cell-click',
  'cell-enter',
  'play-puzzle',
])

const svgViewBox = computed(() => {
  let minX = -50
  let minY = -50
  let maxX = (props.puzzle.size * 100) - 50
  let maxY = (props.puzzle.size * 100) - 50

  minX -= spacerCounts.value.left * 100
  minY -= spacerCounts.value.top * 100
  maxX += spacerCounts.value.right * 100
  maxY += spacerCounts.value.bottom * 100

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
})

const outerGridPath = computed(() => {
  const sideLength = props.puzzle.size * 100
  return [
    'M-50 -50',
    `h${sideLength}`,
    `v${sideLength}`,
    `h-${sideLength}`,
    `v-${sideLength}`,
  ]
})

const regionBordersPath = computed(() => {
  return props.puzzle.cells.flatMap((row) => {
    return row.flatMap((cell) => {
      let paths = [] as Array<string>
      const top = cell.address.row !== 0 && cell.neighbors.up?.region !== cell.region
      const right = cell.address.column !== props.puzzle.size - 1 && cell.neighbors.right?.region !== cell.region
      
      if (top) {
        paths = [
          ...paths,
          `M${(cell.address.column * 100) - 50} ${(cell.address.row * 100) - 50}`,
          `h100`,
        ]
      }

      if (right) {
        if (!top) {
          paths.push(`M${(cell.address.column * 100) + 50} ${(cell.address.row * 100) - 50}`)
        }

        paths.push('v100')
      }

      return paths
    })
  })
})

const spacerCounts = computed(() => {
  let top = 0
  let right = 0
  let left = 0
  let bottom = 0

  const {
    minRow,
    minColumn,
    maxRow,
    maxColumn,
  } = props.puzzle.boundingDimensions

  if (minColumn < 0) {
    left = 0 - minColumn
  }

  if (minRow < 0) {
    top = 0 - minRow
  }

  if (maxRow >= props.puzzle.size) {
    bottom = maxRow - (props.puzzle.size - 1)
  }

  if (maxColumn >= props.puzzle.size) {
    right = maxColumn - (props.puzzle.size - 1)
  }

  const vertical = top + bottom
  const horizontal = left + right
  
  if (vertical < horizontal) {
    top += horizontal - vertical
  } else if (vertical > horizontal) {
    left += vertical - horizontal
  }

  return {
    top,
    bottom,
    left,
    right,
  }
})

function groupUnderOver(shapes?: null|Array<CosmeticShape|Text>) {
  return (shapes || []).reduce(
    (groups, shape) => {
      const { row, column } = shape.address
      const underGrid = Math.round(row) === row && Math.round(column) === column

      if (underGrid) {
        return {
          ...groups,
          underGrid: [
            ...groups.underGrid,
            shape,
          ],
        }
      }

      return {
        ...groups,
        overGrid: [
          ...groups.overGrid,
          shape,
        ],
      }
    },
    {
      underGrid: [],
      overGrid: [],
    } as { underGrid: Array<CosmeticShape|Text>; overGrid: Array<CosmeticShape|Text> },
  )
}

const circles = computed(
  () => groupUnderOver(props.puzzle.visualCircles)
)

const rectangles = computed(
  () => groupUnderOver(props.puzzle.visualRectangles)
)

const texts = computed(
  () => groupUnderOver(props.puzzle.visualText)
)

const errorAddresses = computed(() => props.puzzle.errorAddresses)
</script>

<template lang="pug">
.grid-container(
  :style="{ '--puzzleSize': puzzle.size + spacerCounts.top + spacerCounts.bottom }"
)
  svg.constraints.under-grid(
    :viewBox="svgViewBox"
    preserveAspectRatio="none"
  )
    CellBackgroundColor(
      v-for="{ cell, color }, i in puzzle.visualCellBackgrounds"
      :key="`cell-background-color-${i}`"
      :cell="cell"
      :color="color"
    )
    MinMaxConstraint(
      v-for="{ cell }, i in puzzle.puzzleData.localConstraints.minCells"
      :key="`min-cell-${i}`"
      :cell="cell"
      :puzzle="puzzle"
      type="minimum"
    )
    MinMaxConstraint(
      v-for="{ cell }, i in puzzle.puzzleData.localConstraints.maxCells"
      :key="`max-cell-${i}`"
      :cell="cell"
      :puzzle="puzzle"
      type="maximum"
    )
    ThermometerConstraint(
      v-for="thermo, i in puzzle.puzzleData.localConstraints.thermometers"
      :key="`thermo-${i}`"
      :thermometer="thermo"
    )
    ArrowConstraint(
      v-for="arrow, i in puzzle.puzzleData.localConstraints.arrows"
      :key="`arrow-${i}`"
      :arrow="arrow"
    )
    BetweenLineConstraint(
      v-for="betweenLine, i in puzzle.puzzleData.localConstraints.betweenLines"
      :key="`between-line-${i}`"
      :betweenLine="betweenLine"
    )
    CircleCosmetic(
      v-for="circle, i in circles.underGrid"
      :key="`under-grid-circle-${i}`"
      :circle="circle"
    )
    RectangleCosmetic(
      v-for="rectangle, i in rectangles.underGrid"
      :key="`under-grid-rectangle-${i}`"
      :rectangle="rectangle"
    )
    TextCosmetic(
      v-for="text, i in texts.underGrid"
      :key="`under-grid-text-${i}`"
      :text="text"
    )
    path.diagonal-path(
      v-if="puzzle.puzzleData.globalConstraints.diagonals && puzzle.puzzleData.globalConstraints.diagonals.negative"
      :d="`M-50 -50, L${(puzzle.size * 100) - 50} ${(puzzle.size * 100) - 50}`"
    )
    path.diagonal-path(
      v-if="puzzle.puzzleData.globalConstraints.diagonals && puzzle.puzzleData.globalConstraints.diagonals.positive"
      :d="`M-50 ${(puzzle.size * 100) - 50}, L${(puzzle.size * 100) - 50} -50`"
    )
    LineCosmetic(
      v-for="line, i in puzzle.visualLines"
      :key="`line-${i}`"
      :line="line"
    )
  .grid
    .top-spacer.row(
      v-for="i in spacerCounts.top"
      :key="`top-spacer-${i}`"
    )
    .row(
      v-for="rowCells, row in puzzle.cells"
      :key="`grid-row-${row}`"
    )
      .left-spacer(
        v-for="i in spacerCounts.left"
        :key="`left-spacer-${i}`"
      )
      GridCell(
        v-for="cell, column in rowCells"
        :key="`grid-cell-R${row + 1}C${column + 1}-${cell.digit}`"
        :cell="cell"
        :error="errorAddresses.some(({ row, column }) => row === cell.address.row && column === cell.address.column)"
        v-on:cell-double-click="(event, cell) => emit('cell-double-click', event, cell)"
        v-on:cell-click="(event, cell) => emit('cell-click', event, cell)"
        v-on:cell-enter="(event, cell) => emit('cell-enter', event, cell)"
      )
      .right-spacer(
        v-for="i in spacerCounts.right"
        :key="`right-spacer-${i}`"
      )
    .bottom-spacer.row(
      v-for="i in spacerCounts.bottom"
      :key="`bottom-spacer-${i}`"
    )
    .grid-overlay(
      v-if="timer.paused"
      v-on:click="emit('play-puzzle')"
    )
      .overlay-details(v-on:click.stop)
        .puzzle-info
          .title {{ puzzle.puzzleData.title || 'No Title Given' }}
          .author(v-if="puzzle.author") By: {{ puzzle.author }}
          .rules
            span Rules
            .ruleset {{ puzzle.puzzleData.rules || 'No Rules Given' }}
        v-btn.play-btn(
          v-on:click="emit('play-puzzle')"
          :append-icon="'mdi-play'"
        ) {{ timer.milliseconds === 0 ? 'Play' : 'Resume' }}
  svg.grid-lines(
    :viewBox="svgViewBox"
    preserveAspectRatio="none"
  )
    path.outer-grid-border(:d="outerGridPath")
    g(
      v-for="i in puzzle.size - 1"
      :key="`row-col-group-${i}}`"
    )
      path.cell-border(
        :d="`M${(i * 100) - 50} -50,v${puzzle.size * 100}`"
      )
      path.cell-border(
        :d="`M-50 ${(i * 100) - 50},h${puzzle.size * 100}`"
      )
    path.region-borders(
      :d="regionBordersPath"
    )
  svg.constraints.over-grid(
    :viewBox="svgViewBox"
    preserveAspectRatio="none"
  )
    CircleCosmetic(
      v-for="circle, i in circles.overGrid"
      :key="`over-grid-circle-${i}`"
      :circle="circle"
    )
    RectangleCosmetic(
      v-for="rect, i in rectangles.overGrid"
      :key="`over-grid-rectangle-${i}`"
      :rectangle="rect"
    )
    LittleKillerConstraint(
      v-for="littleKiller, i in puzzle.puzzleData.localConstraints.littleKillerSums"
      :key="`little-killer-${i}`"
      :littleKiller="littleKiller"
    )
    TextCosmetic(
      v-for="text, i in texts.overGrid"
      :key="`over-grid-text-${i}`"
      :text="text"
    )
    KillerCage(
      v-for="cage, i in puzzle.visualCages"
      :key="`cage-${i}`"
      :cage="cage"
    )
    QuadrupleConstraint(
      v-for="quadruple, i in puzzle.puzzleData.localConstraints.quadruples"
      :key="`quadruple-${i}`"
      :quadruple="quadruple"
    )
</template>

<style scoped lang="stylus">
.grid-container
  position relative
  height 100cqmin
  width 100cqmin
  display flex
  user-select none
  touch-action none
  container-type inline-size
  --cell-color-z 0
  --under-grid-z 1
  --grid-z 2
  --over-grid-z 3
  --overlay-z 4

  svg
    position absolute
    pointer-events none
    vector-effect non-scaling-stroke
    width 100%
    height 100%
    font-size 100px
    z-index var(--grid-z)
    overflow visible
    &.under-grid
      z-index var(--under-grid-z)

      .diagonal-path
        stroke #2fb6c1
        stroke-width 3
    &.over-grid
      z-index var(--over-grid-z)

    .outer-grid-border
      stroke #000000
      stroke-width 4
      fill none
      stroke-linecap round
      stroke-linejoin round
    .region-borders
      stroke #000000
      stroke-width 3
      fill none
      stroke-linecap round
      stroke-linejoin round
    .cell-border
      stroke #000000
      stroke-width 1
      fill none

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
