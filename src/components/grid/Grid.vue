<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Puzzle, Cell } from '../../types'

const props = defineProps<{
  base64String?: string;
  puzzle?: Puzzle;
}>()

const selecting = ref(false)
const lastSelected = ref(null as null|{ row: number; col: number })
let puzzle = ref(new Puzzle(9))
if (props.puzzle) {
  puzzle.value = props.puzzle
} else if (props.base64String) {
  puzzle.value = Puzzle.fromBase64String(props.base64String)
}

const classMapFor = (cell: Cell) => {
    const {
      left,
      right,
      up,
      down
    } = cell.neighbors

    return {
      leftOuter: left === undefined,
      leftRegion: left && left.region !== cell.region,
      rightOuter: right === undefined,
      rightRegion: right && right.region !== cell.region,
      topOuter: up === undefined,
      topRegion: up && up.region !== cell.region,
      bottomOuter: down === undefined,
      bottomRegion: down && down.region !== cell.region,
      selectedLeft: cell.selected && (left === undefined || !left.selected),
      selectedRight: cell.selected && (right === undefined || !right.selected),
      selectedTop: cell.selected && (up === undefined || !up.selected),
      selectedBottom: cell.selected && (down === undefined || !down.selected),
      topLeftCornerDot: cell.selected && up && up.selected && left && left.selected && !up.neighbors.left!.selected,
      topRightCornerDot: cell.selected && up && up.selected && right && right.selected && !up.neighbors.right!.selected,
      bottomLeftCornerDot: cell.selected && down && down.selected && left && left.selected && !down.neighbors.left!.selected,
      bottomRightCornerDot: cell.selected && down && down.selected && right && right.selected && !down.neighbors.right!.selected,
    }
}

onMounted(() => {
  window.addEventListener('keydown', maybeGridInput)
  window.addEventListener('mouseup', () => selecting.value = false)
})

onUnmounted(() => {
  window.removeEventListener('keydown', maybeGridInput)
  window.removeEventListener('mouseup', () => selecting.value = false)
})

function maybeGridInput(event: KeyboardEvent) {
  const selected = puzzle.value.selectedCells
  console.log(event.code)

  if (event.code.startsWith('Digit')) {
    const digit = parseInt(event.key, 10)
    if (event.metaKey || event.ctrlKey) {
      event.stopImmediatePropagation
      event.stopPropagation
      event.preventDefault

      if (selected.every((cell) => cell.centerMarks.includes(digit))) {
        selected.forEach((cell) => cell.centerMarks = cell.centerMarks.filter((mark) => mark != digit))
      } else {
        selected.forEach((cell) => {
          if (!cell.centerMarks.includes(digit)) {
            cell.centerMarks = [
              ...cell.centerMarks,
              digit
            ].sort((a, b) => a - b)
          }
        })
      }
    } else {
      selected.forEach((cell) => {
        if (!cell.given) cell.digit = parseInt(event.key, 10)
      })
    }
  } else if (event.code === 'Backspace') {
    if (selected.some((cell) => cell.digit !== null)) {
      selected.forEach((cell) => {
        if (!cell.given) cell.digit = null
      })
    } else if (selected.some((cell) => cell.centerMarks.length > 0)) {
      selected.forEach((cell) => {
        if (!cell.given) cell.centerMarks = []
      })
    }
  } else if (event.code.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
    if (lastSelected.value === null) return

    const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
    if (!addToCurrentSelections) puzzle.value.deselectAll()
    
    let { row, col } = lastSelected.value
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        row -= 1
        break
      case 'KeyS':
      case 'ArrowDown':
        row += 1
        break
      case 'KeyA':
      case 'ArrowLeft':
        col -= 1
        break
      case 'KeyD':
      case 'ArrowRight':
        col += 1
        break
      default:
        throw 'Unknown code'
    }

    if (row === -1) row = puzzle.value.size - 1
    if (row === puzzle.value.size) row = 0
    if (col === -1) col = puzzle.value.size - 1
    if (col === puzzle.value.size) col = 0

    const target = puzzle.value.cellAt({ row, col })
    if (!target.selected) {
      target.selected = true
      lastSelected.value = target.coordinates
    }
  }
}

function cellClick(cell: Cell, event: MouseEvent) {
  selecting.value = true

  const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
  if (!addToCurrentSelections) {
    puzzle.value.deselectAll()
    cell.selected = true
    lastSelected.value = cell.coordinates
  } else {
    cell.selected = !cell.selected
    lastSelected.value = cell.coordinates
  }
}

function cellEnter(cell: Cell, event: MouseEvent) {
  if (!selecting.value) return
  cell.selected = true
  lastSelected.value = cell.coordinates
}
</script>

<template lang="pug">
.grid(v-on:mousedown="puzzle.deselectAll")
  .cells
    .row(
      v-for="row, r in puzzle.cells"
      :key="r"
    )
      .cell(
        v-for="cell, c in row"
        :key="cell.address"
        :class="classMapFor(cell)"
        v-on:mousedown.stop="(event) => cellClick(cell, event)"
        v-on:mouseenter="(event) => cellEnter(cell, event)"
      )
        .corner-selected-dot.top.left
        .corner-selected-dot.top.right
        .corner-selected-dot.bottom.left
        .corner-selected-dot.bottom.right
        .selected-border
          .digit(
            :class="{ given: cell.given }"
          ) {{ cell.digit === null ? '' : cell.digit }}
          .center(
            v-if="cell.digit === null"
          ) {{ cell.centerMarks.join('') }}
</template>

<style scoped lang="stylus">
.grid
  padding 30px

  .cells
    display flex
    flex-direction column
    user-select none

    .row
      display flex

      .cell
        border 1px solid black
        border-bottom-width 0px
        border-right-width 0px
        position: relative

        .corner-selected-dot
          position: absolute
          width: 4px
          height: 4px
          background-color: transparent

          &.top
            top: 0
          &.bottom
            bottom: 0
          &.left
            left: 0
          &.right
            right: 0

        .selected-border
          size = 75px
          width size
          height size
          border 0px solid blue
          padding 4px
          display flex
          flex-direction column
          align-items center
          justify-content center

          .digit
            font-size 3rem
            color #03adfc

            &.given
              color white

        &.topOuter
          border-top-width 6px
        &.leftOuter
          border-left-width 6px
        &.rightOuter
          border-right-width 6px
        &.bottomOuter
          border-bottom-width 6px
        &.leftRegion
          border-left-width 2px
        &.rightRegion
          border-right-width 2px
        &.topRegion
          border-top-width 2px
        &.bottomRegion
          border-bottom-width 2px
        &.selectedTop .selected-border
          border-top-width 4px
          padding-top 0px
        &.selectedBottom .selected-border
          border-bottom-width 4px
          padding-bottom 0px
        &.selectedLeft .selected-border
          border-left-width 4px
          padding-left 0px
        &.selectedRight .selected-border
          border-right-width 4px
          padding-right 0px
        &.topLeftCornerDot .corner-selected-dot.top.left
        &.topRightCornerDot .corner-selected-dot.top.right
        &.bottomLeftCornerDot .corner-selected-dot.bottom.left
        &.bottomRightCornerDot .corner-selected-dot.bottom.right
          background-color blue
</style>
