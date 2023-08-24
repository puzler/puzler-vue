import type { PuzzleSolve } from '..'
import SettingModeController from './setting-mode-controller'
import NumpadControl from '@/components/player/setter-controls/NumpadControl.vue'

class GivenDigitController extends SettingModeController {
  constructor(puzzle: PuzzleSolve) {
    super(puzzle)
    this.allowGridSelect = true
  }

  events = {
    keydown: (event: KeyboardEvent) => {
      if (/^(Digit|Numpad)\d$/.test(event.code)) {
        this.input(parseInt(event.code.charAt(event.code.length - 1), 10))
      } else if (event.code === 'Backspace') {
        this.input('delete')
      }
    },
  }

  controllerVue = () => NumpadControl

  onInput(numpadSelect: string|number) {
    this.puzzle.selectedCells.forEach((cell) => {
      const puzzleDataCell = this.puzzle.puzzleData.cells[cell.address.row][cell.address.column]
      if (numpadSelect === 'delete') {
        cell.given = false
        cell.digit = null
        delete puzzleDataCell.given
        delete puzzleDataCell.digit
      } else {
        cell.digit = numpadSelect as number
        cell.given = true
        puzzleDataCell.given = true
        puzzleDataCell.digit = numpadSelect as number
      }
    })
  }
}

export default GivenDigitController
