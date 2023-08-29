import SettingModeController from './setting-mode-controller'
import type { PuzzleSolveCell } from '@/types'
import type { Address, CellBackgroundColor, ColorInput } from '@/graphql/generated/types'
import CellColorControl from '@/components/player/setter-controls/CellColorControl.vue'

class CellColorController extends SettingModeController {
  formColor = { red: 180, blue: 241, green: 128, opacity: 1 } as ColorInput
  
  get list() {
    const colors = this.puzzle.puzzleData.cosmetics.cellBackgroundColors

    if (!colors) {
      throw new Error('cellBackgroundColors should be defined')
    }

    return colors
  }

  removeOnMouseup = null as null|Address
  formListeners = [] as Array<Function>

  addListener(listener: Function) {
    this.formListeners.push(listener)
  }

  onReset() {
    this.formListeners = []
    this.removeOnMouseup = null
  }

  controllerVue = () => ({ component: CellColorControl })

  events = {
    mouseup: () => {
      if (!this.removeOnMouseup) return
      const removeCheck = { ...this.removeOnMouseup }
      setTimeout(() => {
        if (!this.removeOnMouseup) return

        if (this.addressesAreEqual(this.removeOnMouseup!, removeCheck)) {
          const clickedColorIndex = this.list.findIndex(
            (color) => this.addressesAreEqual(color.cell, this.removeOnMouseup!)
          )

          if (clickedColorIndex >= 0) {
            this.list.splice(clickedColorIndex, 1)
          }
        }

        this.removeOnMouseup = null
      }, 100)
    },
  }

  onCellClick(cell: PuzzleSolveCell) {
    const clickedColorIndex = this.list.findIndex(
      (color) => this.addressesAreEqual(cell.address, color.cell)
    )

    if (clickedColorIndex >= 0) {
      this.removeOnMouseup = cell.address
    } else {
      const newColor = {
        cell: cell.address,
        colors: [this.formColor],
      } as CellBackgroundColor

      this.list.push(newColor)
    }
  }

  onCellDoubleClick(cell: PuzzleSolveCell) {
    this.removeOnMouseup = null
    
    const clickedColorIndex = this.list.findIndex(
      (color) => this.addressesAreEqual(cell.address, color.cell)
    )

    if (clickedColorIndex >= 0) {
      this.formColor = this.list[clickedColorIndex].colors[0]
      this.formListeners.forEach((listener) => listener())
    }
  }
}

export default CellColorController
