import { ref, computed, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { PuzzleSolve } from '@/types'
import {
  GivenDigitController,
  ThermometerController,
  ArrowController,
} from '@/types/setting-mode-controllers'

const usePuzzleSetterStore = defineStore('puzzle-setter', () => {
  const puzzle = ref(new PuzzleSolve({ size: 9 }))
  const settingMode = ref('Given')

  function newPuzzle(size: number) {
    puzzle.value = new PuzzleSolve({ size })

    modeController.value?.reset()
    modeController.value?.setup(puzzle.value as PuzzleSolve)
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

  modeController.value?.setup(puzzle.value as PuzzleSolve)

  function setMode(mode: string) {
    modeController.value?.reset()
    settingMode.value = mode
    puzzle.value.deselectAll()
    modeController.value?.setup(puzzle.value as PuzzleSolve)
  }

  function addElementToPuzzle(element: string) {
    const {
      localConstraints,
      globalConstraints,
    } = puzzle.value.puzzleData
    switch (element) {
      case 'Diagonals':
        globalConstraints.diagonals ||= {
          negative: false,
          positive: false,
        }
        break
      case 'Chess':
        globalConstraints.chess ||= {
          knight: false,
          king: false,
        }
        break
      case 'Thermometers':
        localConstraints.thermometers ||= []
        break
      case 'Arrows':
        localConstraints.arrows ||= []
        break
    }
  }

  function removeElementFromPuzzle(element: string) {
    const {
      localConstraints,
      globalConstraints,
    } = puzzle.value.puzzleData
    switch (element) {
      case 'Diagonals':
        delete globalConstraints.diagonals
        break
      case 'Chess':
        delete globalConstraints.chess
        break
      case 'Thermometers':
        delete localConstraints.thermometers
        break
      case 'Arrows':
        delete localConstraints.arrows
        break
    }
  }

  return {
    puzzle: puzzle as Ref<PuzzleSolve>,
    settingMode,
    modeController,
    newPuzzle,
    setMode,
    addElementToPuzzle,
    removeElementFromPuzzle,
  }
})

export default usePuzzleSetterStore
