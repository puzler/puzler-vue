<script setup lang="ts">
import GridCell from './GridCell.vue'
import KillerCage from './constraints/KillerCage.vue'
import CellBackgroundColor from './constraints/CellBackgroundColor.vue'
import TextCosmetic from './constraints/TextCosmetic.vue'
import LineCosmetic from './constraints/LineCosmetic.vue'
import CircleCosmetic from './constraints/CircleCosmetic.vue'
import RectangleCosmetic from './constraints/RectangleCosmetic.vue'
import ArrowConstraint from './constraints/ArrowConstraint.vue'
import MinMaxIndicators from './constraints/MinMaxIndicators.vue'
import QuadrupleConstraint from './constraints/QuadrupleConstraint.vue'
import LittleKillerConstraint from './constraints/LittleKillerConstraint.vue'
import ThermometerConstraint from './constraints/ThermometerConstraint.vue'
import { computed } from 'vue';
import {
  Timer,
  PuzzleSolve,
  PuzzleSolveCell,
} from '@/types'

const props = defineProps<{
  puzzle: PuzzleSolve
  timer: Timer
  outlineSpacerCells?: boolean
  displayRegions?: boolean
}>()

const emit = defineEmits([
  'cell-double-click',
  'spacer-click',
  'spacer-enter',
  'spacer-double-click',
  'cell-click',
  'cell-enter',
  'play-puzzle',
])

const minMaxXY = computed(() => {
  let minX = 0
  let minY = 0
  let maxX = props.puzzle.size - 1
  let maxY = props.puzzle.size - 1

  minX -= spacerCounts.value.left
  minY -= spacerCounts.value.top
  maxX += spacerCounts.value.right
  maxY += spacerCounts.value.bottom

  return {
    minX,
    minY,
    maxX,
    maxY,
  }
})

const svgViewBox = computed(() => {
  const {
    minX,
    minY,
    maxX,
    maxY,
  } = minMaxXY.value

  return `${minX * 100 - 50} ${minY * 100 - 50} ${(maxX - minX + 1) * 100} ${(maxY - minY + 1) * 100}`
})

const outerGridPath = computed(() => {
  const sideLength = props.puzzle.size * 100
  return [
    'M-50 -50',
    `h${sideLength}`,
    `v${sideLength}`,
    `h-${sideLength}`,
    `v-${sideLength}`,
  ].join(' ')
})

const spacerOutlines = computed(() => {
  const paths = [] as Array<string>
  
  const {
    minX,
    minY,
    maxX,
    maxY,
  } = minMaxXY.value
  
  const verticalLineSize = (maxY - minY + 1) * 100
  for (let i = 0; i < Math.max(maxX - minX, props.puzzle.size - 1); i += 1) {
    paths.push(
      `M${(minX + i) * 100 + 50} ${minY * 100 - 50}`,
      `v${verticalLineSize}`,
    )
  }

  const horizontalLineSize = (maxX - minX + 1) * 100
  for (let i = 0; i < Math.max(maxY - minY, props.puzzle.size - 1); i += 1) {
    paths.push(
      `M${minX * 100 - 50} ${(minY + i) * 100 + 50}`,
      `h${horizontalLineSize}`,
    )
  }

  return paths.join(' ')
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
  }).join(' ')
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

  return {
    top,
    bottom,
    left,
    right,
  }
})

let lastMouseDown = null as null|number
function spacerClick(event: PointerEvent, row: number, column: number) {
  if (event.target instanceof HTMLElement) {
    event.target.releasePointerCapture(event.pointerId)
  }

  const clickTime = Date.now()
  if (!!lastMouseDown && clickTime - lastMouseDown <= 500) {
    emit(
      'spacer-double-click',
      event,
      new PuzzleSolveCell({
        region: -1,
        address: { row, column, __typename: 'Address' },
        puzzle: props.puzzle,
      }),
    )
    lastMouseDown = null
  } else {
    emit(
      'spacer-click',
      event,
      new PuzzleSolveCell({
        region: -1,
        address: { row, column, __typename: 'Address' },
        puzzle: props.puzzle,
      }),
    )
    lastMouseDown = Date.now()
  }

}

function spacerEnter(event: PointerEvent, row: number, column: number) {
  if (event.target instanceof HTMLElement) {
    event.target.releasePointerCapture(event.pointerId)
  }

  event.stopPropagation()
  emit(
    'spacer-enter',
    event,
    new PuzzleSolveCell({
      region: -1,
      address: { row, column, __typename: 'Address' },
      puzzle: props.puzzle,
    }),
  )
}

const selectionBorderPaths = computed(() => {
  const path = [] as Array<string>
  props.puzzle.selectedCells.forEach((cell) => {
    const left = !cell.neighbors.left?.selected
    const right = !cell.neighbors.right?.selected
    const top = !cell.neighbors.up?.selected
    const bottom = !cell.neighbors.down?.selected
    
    path.push(`M${cell.address.column * 100 - 45} ${cell.address.row * 100 - 45}`)
    if (top) {
      path.push('h90', 'm-90 0')
    } else if (left || !cell.neighbors.up!.neighbors.left?.selected) {
      path.push('v-10', 'm0 10')
    }
    if (left) {
      path.push('v90', 'm0 -90')
    } else if (top || !cell.neighbors.left!.neighbors.up?.selected) {
      path.push('h-10', 'm10 0')
    }
    path.pop()

    path.push(`M${cell.address.column * 100 + 45} ${cell.address.row * 100 + 45}`)
    if (bottom) {
      path.push('h-90', 'm90 0')
    } else if (right || !cell.neighbors.down!.neighbors.right?.selected) {
      path.push('v10', 'm0 -10')
    }
    if (right) {
      path.push('v-90', 'm0 90')
    } else if (bottom || !cell.neighbors.right!.neighbors.down?.selected) {
      path.push('h10', 'm-10 0')
    }
    path.pop
  })

  return path.join(' ')
})

const errorAddresses = computed(() => props.puzzle.errorAddresses)

const gridContainerStyle = computed(() => {
  const { top, bottom, left, right } = spacerCounts.value
  const verticalSpace = top + bottom + props.puzzle.size
  const horizontalSpace = left + right + props.puzzle.size

  return {
    '--puzzleSize': Math.min(verticalSpace, horizontalSpace),
    '--puzzleRows': verticalSpace,
    '--puzzleCols': horizontalSpace,
  }
})
</script>

<template lang="pug">
.grid-container(
  :style="gridContainerStyle"
)
  svg(
    :viewBox="svgViewBox"
    preserveAspectRatio="none"
  )
    g.cell-backgrounds(v-if="!displayRegions")
      CellBackgroundColor(
        v-for="{ cell, colors }, i in puzzle.visualCellBackgrounds"
        :key="`cell-background-color-${i}`"
        :cell="cell"
        :colors="colors"
      )
    g.lines(v-if="!displayRegions")
      LineCosmetic(
        v-for="{ key, line } in puzzle.visualLines"
        :key="key"
        :line="line"
      )
    g.thermometers(v-if="!displayRegions")
      ThermometerConstraint(
        v-for="thermo, i in puzzle.puzzleData.localConstraints.thermometers"
        :key="`thermo-${i}`"
        :thermometer="thermo"
      )
    g.arrows(v-if="!displayRegions")
      ArrowConstraint(
        v-for="arrow, i in puzzle.puzzleData.localConstraints.arrows"
        :key="`arrow-${i}`"
        :arrow="arrow"
      )
    g.min-max-indicators(v-if="!displayRegions")
      MinMaxIndicators(
        v-for="{ cell }, i in puzzle.puzzleData.localConstraints.minCells"
        :key="`min-cell-${i}`"
        :cell="cell"
        :puzzle="puzzle"
        type="minimum"
      )
      MinMaxIndicators(
        v-for="{ cell }, i in puzzle.puzzleData.localConstraints.maxCells"
        :key="`max-cell-${i}`"
        :cell="cell"
        :puzzle="puzzle"
        type="maximum"
      )
    g.diagonals(v-if="!displayRegions")
      path.diagonal-path(
        v-if="puzzle.puzzleData.globalConstraints.diagonals && puzzle.puzzleData.globalConstraints.diagonals.negative"
        :d="`M-50 -50 L${(puzzle.size * 100) - 50} ${(puzzle.size * 100) - 50}`"
      )
      path.diagonal-path(
        v-if="puzzle.puzzleData.globalConstraints.diagonals && puzzle.puzzleData.globalConstraints.diagonals.positive"
        :d="`M-50 ${(puzzle.size * 100) - 50} L${(puzzle.size * 100) - 50} -50`"
      )
    g.cages(v-if="!displayRegions")
      KillerCage(
        v-for="cage, i in puzzle.visualCages"
        :key="`cage-${i}`"
        :cage="cage"
      )
    path.selection-border(
      :d="selectionBorderPaths"
    )
    path.spacer-outlines(
      v-if="outlineSpacerCells"
      :d="spacerOutlines"
    )
    g.grid-lines
      path.outer-grid-border(:d="outerGridPath")
      g(
        v-for="i in puzzle.size - 1"
        :key="`row-col-group-${i}}`"
      )
        path.cell-border(
          :d="`M${(i * 100) - 50} -50 v${puzzle.size * 100}`"
        )
        path.cell-border(
          :d="`M-50 ${(i * 100) - 50} h${puzzle.size * 100}`"
        )
      path.region-borders(
        :d="regionBordersPath"
      )
    g.circles(v-if="!displayRegions")
      CircleCosmetic(
        v-for="{ key, circle } in puzzle.visualCircles"
        :key="key"
        :circle="circle"
      )
      QuadrupleConstraint(
        v-for="quadruple, i in puzzle.puzzleData.localConstraints.quadruples"
        :key="`quadruple-${i}`"
        :quadruple="quadruple"
      )
    g.rectangles(v-if="!displayRegions")
      RectangleCosmetic(
        v-for="{ key, rectangle } in puzzle.visualRectangles"
        :key="key"
        :rectangle="rectangle"
      )
    g.texts(v-if="!displayRegions")
      LittleKillerConstraint(
        v-for="littleKiller, i in puzzle.puzzleData.localConstraints.littleKillerSums"
        :key="`little-killer-${i}`"
        :littleKiller="littleKiller"
      )
      TextCosmetic(
        v-for="{ key, text } in puzzle.visualText"
        :key="key"
        :text="text"
      )
  .grid
    .top-spacers.row(
      v-for="i in spacerCounts.top"
      :key="`top-spacer-${i}`"
    )
      .spacer-cell(
        v-for="j in puzzle.size + spacerCounts.left + spacerCounts.right"
        :key="`bottom-spacer-cell-${i}${j}`"
        :class="`R${spacerCounts.top - i - 1}C${j - spacerCounts.left - 1}`"
        v-on:pointerdown="(event) => spacerClick(event, spacerCounts.top - i - 1, j - 1 - spacerCounts.left)"
      )
        .spacer-enter-target(
          v-on:pointerenter="(event) => spacerEnter(event, spacerCounts.top - i - 1, j - 1 - spacerCounts.left)"
        )
    .row(
      v-for="rowCells, row in puzzle.cells"
      :key="`grid-row-${row}`"
    )
      .spacer-cell(
        v-for="i in spacerCounts.left"
        :key="`left-spacer-${i}`"
        :class="`R${row}C${i - 1 - spacerCounts.left}`"
        v-on:pointerdown="(event) => spacerClick(event, row, i - 1 - spacerCounts.left)"
      )
        .spacer-enter-target(
          v-on:pointerenter="(event) => spacerEnter(event, row, i - 1 - spacerCounts.left)"
        )
      GridCell(
        v-for="cell, column in rowCells"
        :key="`grid-cell-R${row + 1}C${column + 1}-${cell.digit}`"
        :cell="cell"
        :error="errorAddresses.some(({ row, column }) => row === cell.address.row && column === cell.address.column)"
        v-on:cell-double-click="(event, cell) => emit('cell-double-click', event, cell)"
        v-on:cell-click="(event, cell) => emit('cell-click', event, cell)"
        v-on:cell-enter="(event, cell) => emit('cell-enter', event, cell)"
        :displayRegion="displayRegions"
      )
      .spacer-cell(
        v-for="i in spacerCounts.right"
        :key="`right-spacer-${i}`"
        :class="`R${row}C${puzzle.size + i - 1}`"
        v-on:pointerdown="(event) => spacerClick(event, row, puzzle.size + i - 1)"
      )
        .spacer-enter-target(
          v-on:pointerenter="(event) => spacerEnter(event, row, puzzle.size + i - 1)"
        )
    .bottom-spacers.row(
      v-for="i in spacerCounts.bottom"
      :key="`bottom-spacer-${i}`"
    )
      .spacer-cell(
        v-for="j in puzzle.size + spacerCounts.left + spacerCounts.right"
        :key="`bottom-spacer-cell-${i}${j}`"
        :class="`R${puzzle.size + i - 1}C${j - spacerCounts.left - 1}`"
        v-on:pointerdown="(event) => spacerClick(event, puzzle.size + i - 1, j - spacerCounts.left - 1)"
      )
        .spacer-enter-target(
          v-on:pointerenter="(event) => spacerEnter(event, puzzle.size + i - 1, j - spacerCounts.left - 1)"
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
</template>

<style scoped lang="stylus">
.grid-container
  position relative
  height 100cqh
  width 100cqw
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
    overflow visible

    .spacer-outlines
      stroke rgba(0, 0, 0, 0.3)
      stroke-width 1
      fill none
      stroke-dasharray 10 15
    .selection-border
      stroke rgba(0, 107, 255, 0.5)
      stroke-width 10
      fill none
      stroke-linecap round
      stroke-linejoin round
    .diagonal-path
      stroke #2fb6c1
      stroke-width 3
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

  .spacer-cell
    padding var(--selectedBorderWidth)
    .spacer-enter-target
      height 100%
      width 100%
  .grid
    display grid
    position relative
    font-size calc(100cqw / var(--puzzleSize))
    flex 1
    grid-template-rows repeat(var(--puzzleRows), 1fr)
    --selectedBorderWidth calc(10cqmin / var(--puzzleSize))

    .row
      display grid
      grid-template-columns repeat(var(--puzzleCols), 1fr)

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
