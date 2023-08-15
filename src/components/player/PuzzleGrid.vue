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
  Puzzle,
  Timer,
  type Circle,
  type Rectangle,
} from '@/types'

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

const svgViewBox = computed(() => {
  const {
    minCol,
    minRow,
    maxCol,
    maxRow,
  } = props.puzzle.dimensions

  let minX = minCol * 100
  let minY = minRow * 100
  let maxX = maxCol * 100
  let maxY = maxRow * 100

  return `${minX} ${minY} ${maxX + 100 - minX} ${maxY + 100 - minY}`
})

const outerGridPath = computed(() => {
  const sideLength = props.puzzle.size * 100
  return [
    'M100 100',
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
      const top = cell.coordinates.row !== 1 && cell.neighbors.up?.region !== cell.region
      const right = cell.coordinates.col !== props.puzzle.size && cell.neighbors.right?.region !== cell.region
      
      if (top) {
        paths = [
          ...paths,
          `M${cell.coordinates.col * 100} ${cell.coordinates.row * 100}`,
          `h100`,
        ]
      }

      if (right && cell.coordinates.col !== props.puzzle.size) {
        if (!top) {
          paths.push(`M${(cell.coordinates.col + 1) * 100} ${cell.coordinates.row * 100}`)
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

  if (props.puzzle.dimensions.minCol < 1) {
    left = 1 - props.puzzle.dimensions.minCol
  }

  if (props.puzzle.dimensions.minRow < 1) {
    top = 1 - props.puzzle.dimensions.minRow
  }

  if (props.puzzle.dimensions.maxRow > props.puzzle.size) {
    bottom = props.puzzle.dimensions.maxRow - props.puzzle.size
  }

  if (props.puzzle.dimensions.maxCol > props.puzzle.size) {
    right = props.puzzle.dimensions.maxCol - props.puzzle.size
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

const circles = computed(() => {
  return (props.puzzle.circles || []).reduce(
    (groups, circle) => {
      if (circle.cells.length === 1) {
        return {
          ...groups,
          underGrid: [
            ...groups.underGrid,
            circle,
          ],
        }
      }

      return {
        ...groups,
        overGrid: [
          ...groups.overGrid,
          circle,
        ],
      }
    },
    {
      underGrid: [],
      overGrid: [],
    } as Record<string, Array<Circle>>,
  )
})

const rectangles = computed(() => {
  return (props.puzzle.rectangles || []).reduce(
    (groups, rect) => {
      if (rect.cells.length === 1) {
        return {
          ...groups,
          underGrid: [
            ...groups.underGrid,
            rect,
          ],
        }
      }

      return {
        ...groups,
        overGrid: [
          ...groups.overGrid,
          rect,
        ],
      }
    },
    {
      underGrid: [],
      overGrid: [],
    } as Record<string, Array<Rectangle>>,
  )
})
</script>

<template lang="pug">
.grid-container(:style="{ '--puzzleSize': puzzle.size + spacerCounts.top + spacerCounts.bottom }")
  svg.constraints.under-grid(
    :viewBox="svgViewBox"
    preserveAspectRatio="none"
  )
    CellBackgroundColor(
      v-for="cellColor, i in puzzle.cellBackgroundColors"
      :key="`cell-background-color-${i}`"
      :address="cellColor.address"
      :color="cellColor.color"
      :puzzle="puzzle"
    )
    MinMaxConstraint(
      v-for="minCell, i in puzzle.minCells"
      :key="`min-cell-${i}`"
      :minMaxCell="minCell"
      :puzzle="puzzle"
      type="minimum"
    )
    MinMaxConstraint(
      v-for="maxCell, i in puzzle.maxCells"
      :key="`max-cell-${i}`"
      :minMaxCell="maxCell"
      :puzzle="puzzle"
      type="maximum"
    )
    g.extra-region-background(
      v-for="extraRegion, i in puzzle.extraRegions"
      :key="'extra-region-background-group' + i"
    )
      CellBackgroundColor(
        v-for="address, j in extraRegion.cells"
        :key="`extra-region-${i}-background-cell-${j}`"
        :address="address"
        color="#dddddd"
        :puzzle="puzzle"
      )
    CellBackgroundColor(
      v-for="cloneCell, i in puzzle.clones"
      :key="'clone-cell-' + i"
      :address="cloneCell.cells[0]"
      :color="cloneCell.fill"
      :puzzle="puzzle"
    )
    ThermometerConstraint(
      v-for="thermo, i in puzzle.thermometers"
      :key="'thermo-' + i"
      :thermometer="thermo"
      :puzzle="puzzle"
    )
    ArrowConstraint(
      v-for="arrow, i in puzzle.arrows"
      :key="'arrow-' + i"
      :arrow="arrow"
      :puzzle="puzzle"
    )
    BetweenLineConstraint(
      v-for="betweenLine, i in puzzle.betweenLines"
      :key="'between-line-' + i"
      :betweenLine="betweenLine"
      :puzzle="puzzle"
    )
    CircleCosmetic(
      v-for="circle, i in circles.underGrid"
      :key="`under-grid-circle-${i}`"
      :circle="circle"
      :puzzle="puzzle"
    )
    RectangleCosmetic(
      v-for="rectangle, i in rectangles.underGrid"
      :key="`under-grid-rectangle-${i}`"
      :rectangle="rectangle"
      :puzzle="puzzle"
    )
    path.diagonal-path(
      v-if="puzzle.diagonals && puzzle.diagonals.positive"
      :d="`M100 100, L${(puzzle.size + 1) * 100} ${(puzzle.size + 1) * 100}`"
    )
    path.diagonal-path(
      v-if="puzzle.diagonals && puzzle.diagonals.negative"
      :d="`M100 ${(puzzle.size + 1) * 100}, L${(puzzle.size + 1) * 100} 100`"
    )
    LineCosmetic(
      v-for="line, i in puzzle.lines"
      :key="'line-' + i"
      :line="line"
      :puzzle="puzzle"
    )
  .grid
    .top-spacer.row(
      v-for="i in spacerCounts.top"
      :key="`top-spacer-${i}`"
    )
    .row(
      v-for="row, r in props.puzzle.cells"
      :key="'grid-row-' + r"
    )
      .left-spacer(
        v-for="i in spacerCounts.left"
        :key="`left-spacer-${i}`"
      )
      GridCell(
        v-for="cell in row"
        :key="'cell-' + cell.address"
        :cell="cell"
        :error="puzzle.errorAddresses.includes(cell.address)"
        v-on:double-click="(event, cell) => emit('cell-double-click', event, cell)"
        v-on:mousedown="(event, cell) => emit('cell-click', event, cell)"
        v-on:mouseenter="(event, cell) => emit('cell-enter', event, cell)"
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
          .title {{ puzzle.title || 'No Title Given' }}
          .author(v-if="puzzle.author") By: {{ puzzle.author }}
          .rules
            span Rules
            .ruleset {{ puzzle.rules || 'No Rules Given' }}
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
      v-for="i in puzzle.size"
      :key="`row-col-group-${i}}`"
    )
      path.cell-border(
        :d="`M${i * 100} 100,h100,v${puzzle.size * 100},h-100,v-${puzzle.size * 100}`"
      )
      path.cell-border(
        :d="`M100 ${i * 100},v100,h${puzzle.size * 100},v-100,h-${puzzle.size * 100}`"
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
      :key="'over-grid-circle-' + i"
      :circle="circle"
      :puzzle="puzzle"
    )
    RectangleCosmetic(
      v-for="rect, i in rectangles.overGrid"
      :key="'over-grid-rectangle-' + i"
      :rectangle="rect"
      :puzzle="puzzle"
    )
    LittleKillerConstraint(
      v-for="littleKiller, i in puzzle.littleKillers"
      :key="`little-killer-${i}`"
      :littleKiller="littleKiller"
      :puzzle="puzzle"
    )
    TextCosmetic(
      v-for="sandwichSum, i in puzzle.sandwichSums"
      :key="`sandwich-${i}`"
      :text="{ cells: [sandwichSum.cell], fontC: '#000000', size: 0.65, value: sandwichSum.value }"
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
    KillerCage(
      v-for="region, i in puzzle.extraRegions"
      :key="'extra-region-' + i"
      :cage="region"
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
        stroke #2fa3c1
        stroke-width 2
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
