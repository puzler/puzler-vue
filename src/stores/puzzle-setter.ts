import { ref, computed, type Ref } from 'vue'
import { defineStore } from 'pinia'
import {
  Puzzle
} from '@/types'
import {
  GivenDigitController,
  ThermometerController,
  ArrowController,
} from '@/types/setting-mode-controllers'

const usePuzzleSetterStore = defineStore('puzzle-setter', () => {
  const puzzle = ref(new Puzzle(9))
  const settingMode = ref('Given')

  function newPuzzle(size: number) {
    puzzle.value = new Puzzle(size)

    modeController.value?.reset()
    modeController.value?.setup(puzzle.value as Puzzle)
  }

  const modeController = computed(() => {
    switch (settingMode.value) {
      case 'Given':
        return GivenDigitController
      case 'Thermometers':
        return ThermometerController
      case 'Arrows':
        return ArrowController
    }

    throw 'Unknown Setting Mode'
  })

  modeController.value?.setup(puzzle.value as Puzzle)

  function setMode(mode: string) {
    modeController.value?.reset()
    settingMode.value = mode
    puzzle.value.deselectAll()
    modeController.value?.setup(puzzle.value as Puzzle)
  }

  function addElementToPuzzle(element: string) {
    switch (element) {
      case 'Diagonals':
        puzzle.value.diagonals ||= {
          negative: false,
          positive: false,
        }
        break
      case 'Chess':
        puzzle.value.chess ||= {
          knight: false,
          king: false,
        }
        break
      case 'Thermometers':
        puzzle.value.thermometers ||= []
        break
      case 'Arrows':
        puzzle.value.arrows ||= []
        break
    }
  }

  function removeElementFromPuzzle(element: string) {
    switch (element) {
      case 'Diagonals':
        delete puzzle.value.diagonals
        break
      case 'Chess':
        delete puzzle.value.chess
        break
      case 'Thermometers':
        delete puzzle.value.thermometers
        break
      case 'Arrows':
        delete puzzle.value.arrows
        break
    }
  }

  return {
    puzzle: puzzle as Ref<Puzzle>,
    settingMode,
    modeController,
    newPuzzle,
    setMode,
    addElementToPuzzle,
    removeElementFromPuzzle,
  }
})

export default usePuzzleSetterStore
