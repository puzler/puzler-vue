import SettingModeController from './setting-mode-controller'
import NumpadControl from '@/components/player/setter-controls/NumpadControl.vue'

class RegionEditorController extends SettingModeController {
  allowGridSelect = true
  controllerVue = () => ({
    component: NumpadControl,
    props: {
      numpad: [
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
        null, 0, null,
      ]
    }
  })

  events = {
    keydown: (event: KeyboardEvent) => {
      if (/^(Numpad|Digit)\d$/.test(event.code)) {
        this.input(parseInt(event.code.charAt(event.code.length - 1), 10))
      }
    },
  }

  onInput(digit: number) {
    this.puzzle.selectedCells.forEach(
      (cell) => {
        cell.region = digit - 1
        const { row, column } = cell.address
        this.puzzle.puzzleData.cells[row][column].region = digit - 1
      }
    )
  }
}

export default RegionEditorController
