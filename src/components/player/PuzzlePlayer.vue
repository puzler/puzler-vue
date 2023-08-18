<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import useColorStore from '@/stores/color'
import useSettingStore from '@/stores/setting'
import PuzzleGrid from './PuzzleGrid.vue'
import ControlPad from './ControlPad.vue'
import ColorPaletteEditor from './ColorPaletteEditor.vue'
import SettingsEditor from './SettingsEditor.vue'
import {
  Cell,
  Puzzle,
  Controller,
  ControllerMode,
  Timer,
} from '@/types'

const props = defineProps<{
  base64String?: string;
  puzzleId?: string;
  puzzle?: Puzzle;
}>()

const settingsStore = useSettingStore()
const colorStore = useColorStore()
const colorPalette = colorStore.palette

const puzzle = ref(
  (() => {
    if (props.base64String) return Puzzle.fromBase64String(props.base64String)
    // if (props.puzzleId) {} TODO Puzler API Implementation
    if (props.puzzle) return props.puzzle
    
    return new Puzzle(9)
  })(),
)

const playTimerOnVisible = ref(false)
const timer = ref(new Timer())
const controller = ref(new Controller())
const selecting = ref(false)
const lastSelected = ref(null as null|{ row: number; col: number })

if (!settingsStore.userSettings.startPaused) {
  if (document.visibilityState === 'visible') {
    timer.value.play()
  } else {
    playTimerOnVisible.value = true
  }
}

function setTimerByVisibility() {
  if (document.visibilityState === 'visible' && timer.value.paused && playTimerOnVisible.value) {
    timer.value.play()
    playTimerOnVisible.value = false
  } else if (document.visibilityState === 'hidden' && !timer.value.paused) {
    timer.value.pause()
    playTimerOnVisible.value = true
  }
}

const modals = [
  'correctSolution',
  'incorrectSolution',
  'colorPaletteEditor',
  'editSettings',
]

const modalActivators = modals.reduce(
  (activators, modalId) => {
    return {
      ...activators,
      [modalId]: document.createElement('button'),
    }
  },
  {} as Record<string, HTMLElement>,
)

onMounted(() => {
  window.addEventListener('keydown', keyboardInput)
  window.addEventListener('keyup', releaseTempMode)
  window.addEventListener('mouseup', resetSelecting)
  document.addEventListener('visibilitychange', setTimerByVisibility)
})

onUnmounted(() => {
  window.removeEventListener('keydown', keyboardInput)
  window.removeEventListener('keyup', releaseTempMode)
  window.removeEventListener('mouseup', resetSelecting)
  document.removeEventListener('visibilitychange', setTimerByVisibility)
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

function handleActionInput(action: string, args = {} as Record<string, any>) {
  switch (action) {
    case 'delete':
      return handleEraseInput()
    case 'editColors':
      return modalActivators.colorPaletteEditor.click()
    case 'editSettings':
      return modalActivators.editSettings.click()
    case 'cycleColorPage': {
      let nextPageIndex = controller.value.colorPageIndex + 1
      if (nextPageIndex >= colorPalette.pages.length) {
        nextPageIndex = 0
      }
      return controller.value.colorPageIndex = nextPageIndex
    }
    case 'setControllerMode':
      return controller.value.mode = args.mode
    case 'checkSolution': {
      if (puzzle.value.checkSolution()) {
        timer.value.pause()
        return modalActivators.correctSolution.click()
      } else {
        return modalActivators.incorrectSolution.click()
      }
    }
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

      if (settingsStore.userSettings.checkOnFinish && puzzle.value.checkSolution()) {
        timer.value.pause()
        modalActivators.correctSolution.click()
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
    case ControllerMode.color: {
      const colorKey = colorPalette.pages[controller.value.colorPageIndex][digit]
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

    if (row === 0) row = puzzle.value.size
    if (row > puzzle.value.size) row = 1
    if (col === 0) col = puzzle.value.size
    if (col > puzzle.value.size) col = 1

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

function cellEnter(event: PointerEvent, cell: Cell) {
  if (!selecting.value) return
  cell.selected = true
  lastSelected.value = cell.coordinates
}

function cellClick(event: PointerEvent, cell?: Cell) {
  if (event.target instanceof HTMLElement) {
    event.target.releasePointerCapture(event.pointerId)
  }

  selecting.value = true
  const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
  if (!addToCurrentSelections) {
    puzzle.value.deselectAll()
    if (cell) {
      cell.selected = true
      lastSelected.value = cell.coordinates
    }
  } else if (cell) {
    cell.selected = !cell.selected
    lastSelected.value = cell.coordinates
  }
}

function cellDoubleClick(event: PointerEvent, cell: Cell) {
  if (event.target instanceof HTMLElement) {
    event.target.releasePointerCapture(event.pointerId)
  }

  selecting.value = true
  const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
  if (!addToCurrentSelections) {
    puzzle.value.deselectAll()
  }
  lastSelected.value = cell.coordinates

  let modeToTarget: ControllerMode
  if (controller.value.mode === ControllerMode.color && cell.cellColors.length) {
    modeToTarget = ControllerMode.color
  } else if (cell.digit !== null) {
    modeToTarget = ControllerMode.digit
  } else if (controller.value.mode === ControllerMode.center && cell.centerMarks.length) {
    modeToTarget = ControllerMode.center
  } else if (controller.value.mode === ControllerMode.corner && cell.cornerMarks.length) {
    modeToTarget = ControllerMode.corner
  } else if (cell.centerMarks.length) {
    modeToTarget = ControllerMode.center
  } else if (cell.cornerMarks.length) {
    modeToTarget = ControllerMode.corner
  } else if (cell.cellColors.length) {
    modeToTarget = ControllerMode.color
  } else {
    cell.selected = true
    return
  }

  puzzle.value.cells.forEach((row) => {
    row.forEach((checkCell) => {
      switch (modeToTarget) {
        case ControllerMode.digit:
          if (checkCell.digit === cell.digit) checkCell.selected = true
          break
        case ControllerMode.center: {
          if (cell.centerMarks.every((num) => checkCell.centerMarks.includes(num))) {
            checkCell.selected = true
          }
          break
        }
        case ControllerMode.corner: {
          if (cell.cornerMarks.every((num) => checkCell.cornerMarks.includes(num))) {
            checkCell.selected = true
          }
          break
        }
        case ControllerMode.color: {
          if (cell.cellColors.every((key) => checkCell.cellColors.includes(key))) {
            checkCell.selected = true
          }
          break
        }
      }
    })
  })
}
</script>

<template lang="pug">
.player-container(v-on:pointerdown="cellClick")
  ColorPaletteEditor(
    :activator="modalActivators.colorPaletteEditor"
    :selectedPageIndex="controller.colorPageIndex"
  )
  SettingsEditor(
    :activator="modalActivators.editSettings"
  )
  v-dialog(
    :activator="modalActivators.correctSolution"
  )
    .message-modal
      .set-solution(v-if="puzzle.solution") Your solution is correct
      .no-set-solution(v-else) No solution was provided, but that looks correct!
  v-dialog(
    :activator="modalActivators.incorrectSolution"
  )
    .message-modal Something seems wrong
  .puzzle-grid-container
    PuzzleGrid(
      :puzzle="puzzle"
      :timer="timer"
      v-on:cell-enter="cellEnter"
      v-on:cell-click="cellClick"
      v-on:cell-double-click="cellDoubleClick"
      v-on:play-puzzle="timer.play()"
    )
  ControlPad(
    :timer="timer"
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

  .puzzle-grid-container
    height 100cqmin
    width 100cqmin
    max-height calc(79cqw - 20px)
    max-width calc(79cqw - 20px)
    container-type inline-size

.message-modal
  background-color white
  padding 20px 25px
  display flex
  align-items center
  justify-content center
  border-radius 10px
  width fit-content
  align-self center

@media screen and (max-width: 900px)
  .player-container
    flex-direction column
    padding 10px
    .puzzle-grid-container
      max-height calc(60cqh - 20px)
      max-width calc(60cqh - 20px)
</style>