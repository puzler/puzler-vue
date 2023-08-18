import SettingModeController from './setting-mode-controller'
import NumpadControl from '@/components/player/setter-controls/NumpadControl.vue'

class GivenDigitController extends SettingModeController {
  constructor() {
    super()
    this.controllerVue = NumpadControl
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

  onInput(numpadSelect: string|number) {
    this.puzzle?.selectedCells.forEach((cell) => {
      if (numpadSelect === 'delete') {
        cell.given = false
        cell.digit = null
      } else {
        cell.digit = numpadSelect as number
        cell.given = true
      }
    })
  }
}

export default new GivenDigitController()
