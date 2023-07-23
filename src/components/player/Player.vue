<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import useColorStore from '../../stores/color'
import Grid from './Grid.vue'
import ControlPad from './ControlPad.vue'
import {
  Cell,
  Puzzle,
  Controller,
  ControllerMode,
} from '../../types'

const props = defineProps<{
  base64String?: string;
  puzzleId?: string;
  puzzle?: Puzzle;
}>()

const colorStore = useColorStore()
const colorPalette = colorStore.palette

let _puzzle: Puzzle
if (props.base64String) {
  _puzzle = Puzzle.fromBase64String(props.base64String)
} else if (props.puzzleId) {
  // TODO Puzler API Implementation
} else if (props.puzzle) {
  _puzzle = props.puzzle
}
_puzzle ||= new Puzzle(9)

const puzzle = ref(_puzzle)
const controller = ref(new Controller(colorPalette))
const selecting = ref(false)
const lastSelected = ref(null as null|{ row: number; col: number })

onMounted(() => {
  window.addEventListener('keydown', keyboardInput)
  window.addEventListener('keyup', releaseTempMode)
  window.addEventListener('mouseup', resetSelecting)
})

onUnmounted(() => {
  window.removeEventListener('keydown', keyboardInput)
  window.removeEventListener('keyup', releaseTempMode)
  window.removeEventListener('mouseup', resetSelecting)
})

function resetSelecting() {
  selecting.value = false
}

const clearDigits = (cells: Array<Cell>) => cells.forEach(
  (cell) => cell.digit = null,
)
const clearColor = (cells: Array<Cell>) => cells.forEach(
  (cell) => cell.cellColors = []
)
const clearCenter = (cells: Array<Cell>) => cells.forEach(
  (cell) => {
    if (cell.digit === null) {
      cell.centerMarks = []
    }
  },
)
const clearCorner = (cells: Array<Cell>) => cells.forEach(
  (cell) => {
    if (cell.digit === null) {
      cell.cornerMarks = []
    }
  },
)

function handleEraseInput() {
  const selected = puzzle.value.selectedCells
  const nonGiven = selected.filter(
    (cell) => !cell.given
  )

  const anyDigits = nonGiven.some((cell) => cell.digit !== null)
  const anyCenter = nonGiven.some(
    (cell) => cell.digit === null && cell.centerMarks.length > 0,
  )
  const anyCorner = nonGiven.some(
    (cell) => cell.digit === null && cell.cornerMarks.length > 0,
  )
  const anyColor = selected.some(
    (cell) => cell.cellColors.length > 0
  )

  switch (controller.value.activeMode) {
    case ControllerMode.digit:
      if (anyDigits) {
        clearDigits(nonGiven)
        return
      }
      break
    case ControllerMode.center:
      if (anyCenter) {
        clearCenter(nonGiven)
        return
      }
      break
    case ControllerMode.corner:
      if (anyCorner) {
        clearCorner(nonGiven)
        return
      }
      break
    case ControllerMode.color:
      if (anyColor) {
        clearColor(selected)
        return
      }
      break
  }

  if (anyDigits) {
    clearDigits(nonGiven)
    return
  }
  if (anyCenter) {
    clearCenter(nonGiven)
    return
  }
  if (anyCorner) {
    clearCorner(nonGiven)
    return
  }
  if (anyColor) {
    clearColor(selected)
  }
}

function handleActionInput(action: string) {
  switch (action) {
    case 'delete':
      return handleEraseInput()
  }
}

function handleDigitInput(digit: number) {
  let targetCells = puzzle.value.selectedCells
  if (controller.value.activeMode !== ControllerMode.color) {
    targetCells = targetCells.filter((cell) => !cell.given)
    if (controller.value.activeMode !== ControllerMode.digit) {
      targetCells = targetCells.filter((cell) => cell.digit === null)
    }
  } 


  switch (controller.value.activeMode) {
    case ControllerMode.digit:
      if (targetCells.every((cell) => cell.digit === digit)) {
        targetCells.forEach((cell) => cell.digit = null)
      } else {
        targetCells.forEach((cell) => cell.digit = digit)
      }
      break
    case ControllerMode.center:
      if (targetCells.every((cell) => cell.centerMarks.includes(digit))) {
        targetCells.forEach((cell) => cell.centerMarks = cell.centerMarks.filter((mark) => mark !== digit))
      } else {
        targetCells.forEach((cell) => {
          if (!cell.centerMarks.includes(digit)) {
            cell.centerMarks = [
              ...cell.centerMarks,
              digit
            ].sort((a, b) => a - b)
          }
        })
      }
      break
    case ControllerMode.corner:
      if (targetCells.every((cell) => cell.cornerMarks.includes(digit))) {
        targetCells.forEach(
          (cell) => cell.cornerMarks = cell.cornerMarks.filter(
            (mark) => mark !== digit,
          ),
        )
      } else {
        targetCells.forEach(
          (cell) => {
            if (!cell.cornerMarks.includes(digit)) {
              cell.cornerMarks = [
                ...cell.cornerMarks,
                digit
              ].sort((a, b) => a - b)
            }
          }
        )
      }
      break
    case ControllerMode.color:
      const colorKey = controller.value.colorPage[digit].key
      if (targetCells.every((cell) => cell.cellColors.includes(colorKey))) {
        targetCells.forEach((cell) => {
          cell.cellColors = cell.cellColors.filter((key) => key !== colorKey)
        })
      } else {
        targetCells.forEach((cell) => {
          if (!cell.cellColors.includes(colorKey)) {
            cell.cellColors = [
              ...cell.cellColors,
              colorKey
            ].sort()
          }
        })
      }
      break
  }
}

function releaseTempMode(event: KeyboardEvent) {
  if (event.code.startsWith('Shift')) {
    controller.value.modKeys.shift = false
  } else if (event.code.startsWith('Meta')) {
    controller.value.modKeys.meta = false
  } else if (event.code.startsWith('Control')) {
    controller.value.modKeys.ctrl = false
  } else if (event.code.startsWith('Alt')) {
    controller.value.modKeys.alt = false
  }
}

function keyboardInput(event: KeyboardEvent) {
  console.log(event.code)
  const selected = puzzle.value.selectedCells
  const nonGiven = selected.filter((cell) => !cell.given)

  if (/^(Digit|Numpad)\d$/.test(event.code)) {
    handleDigitInput(
      parseInt(event.code.charAt(event.code.length - 1), 10),
    )
  } else if (event.code === 'Backspace') {
    handleEraseInput()
  } else if (event.code === 'Space') {
    const active = document.activeElement
    if (active instanceof HTMLElement && active.tagName !== 'BODY') {
      active.click()
      active.blur()
    } else {
      let newMode = controller.value.mode + 1
      if (ControllerMode[newMode] === undefined) {
        newMode = 0
      }
      controller.value.mode = newMode
    }
  } else if (/^(Key(A|W|S|D)|Arrow\w+)$/.test(event.code)) {
    if (event.code === 'KeyA' && (event.ctrlKey || event.metaKey)) {
      puzzle.value.cells.forEach((row) => row.forEach((cell) => cell.selected = true))
      event.stopImmediatePropagation()
      event.stopPropagation()
      event.preventDefault()
      return
    }
  
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
  } else if (event.code.startsWith('Shift')) {
    controller.value.modKeys.shift = true
  } else if (event.code.startsWith('Control')) {
    controller.value.modKeys.ctrl = true
  } else if (event.code.startsWith('Meta')) {
    controller.value.modKeys.meta = true
  } else if (event.code.startsWith('Alt')) {
    controller.value.modKeys.alt = true
  }
}

function cellEnter(event: MouseEvent, cell: Cell) {
  if (!selecting.value) return
  cell.selected = true
  lastSelected.value = cell.coordinates
}

function cellClick(event: MouseEvent, cell?: Cell) {
  selecting.value = true
  const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
  if (!addToCurrentSelections) {
    puzzle.value.deselectAll()
    if (!!cell) {
      cell.selected = true
      lastSelected.value = cell.coordinates
    }
  } else if (!!cell) {
    cell.selected = !cell.selected
    lastSelected.value = cell.coordinates
  }
}
</script>

<template lang="pug">
.player-container(v-on:mousedown="cellClick")
  Grid(
    :puzzle="puzzle"
    v-on:cell-enter="cellEnter"
    v-on:cell-click="cellClick"
  )
  ControlPad(
    :controller="controller"
    v-on:numpad-click="handleDigitInput"
    v-on:action-click="handleActionInput"
  )
</template>

<style scoped lang="stylus">
.player-container
  display flex
  align-items center
  justify-content center
  width 100cqw
  height 100cqh
  padding 20px
  container-type size
  container-name player
  gap 20px

@media screen and (max-width: 900px)
  .player-container
    flex-direction column
</style>