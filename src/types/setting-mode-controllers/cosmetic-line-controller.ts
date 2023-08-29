import type { Address, CustomLine } from '@/graphql/generated/types'
import SettingModeController from './setting-mode-controller'
import type { PuzzleSolveCell } from '@/types'
import CosmeticLineControl from '@/components/player/setter-controls/CosmeticLineControl.vue'

class CosmeticLineController extends SettingModeController {
  lineForm = {
    color: { red: 154, green: 121, blue: 239, opacity: 1 },
    width: 0.2,
  }

  controllerVue = () => ({ component: CosmeticLineControl })

  formListeners = [] as Array<Function>
  addListener(listener: Function) {
    this.formListeners.push(listener)
  }

  onReset() {
    this.formListeners = []
    this.currentLine = null
    this.removeOnMouseup = null
  }

  events = {
    mouseup: () => {
      if (this.removeOnMouseup) {
        const doubleCheck = { ...this.removeOnMouseup }
        setTimeout(() => {
          if (this.removeOnMouseup && this.addressesAreEqual(this.removeOnMouseup, doubleCheck)) {
            const clickedLine = this.lines.findIndex(
              ({ points }) => points.some((address) => this.addressesAreEqual(address, this.removeOnMouseup!))
            )

            if (clickedLine >= 0) {
              this.lines.splice(clickedLine, 1)
            }
          }

          this.removeOnMouseup = null
        }, 100)
      }

      this.puzzle.puzzleData.cosmetics.lines = this.lines.filter(
        ({ points }) => points.length >= 2
      )
      this.currentLine = null
    }
  }

  currentLine = null as null|CustomLine
  removeOnMouseup = null as null|Address

  get lines() {
    const list = this.puzzle.puzzleData.cosmetics.lines

    if (!list) {
      throw new Error('Lines should be defined')
    }

    return list
  }

  onCellClick(cell: PuzzleSolveCell) {
    this.removeOnMouseup = cell.address

    const newLine = {
      ...this.lineForm,
      points: [cell.address],
    }

    this.currentLine = newLine
    this.lines.push(newLine)
  }

  onCellDoubleClick(cell: PuzzleSolveCell) {
    const clickedLine = this.lines.find(
      ({ points }) => points.some((address) => this.addressesAreEqual(cell.address, address)),
    )

    if (clickedLine) {
      this.lineForm = {
        color: clickedLine.color,
        width: clickedLine.width,
      }
      this.formListeners.forEach((listener) => listener())
    }

    this.onCellClick(cell)
    this.removeOnMouseup = null
  }

  onCellEnter(cell: PuzzleSolveCell) {
    this.removeOnMouseup = null
    if (this.currentLine) {
      const cellIndex = this.currentLine.points.findIndex(
        (address) => this.addressesAreEqual(address, cell.address),
      )

      if (cellIndex === -1) {
        this.currentLine.points.push(cell.address)
      } else {
        this.currentLine.points = this.currentLine.points.filter(
          (_, i) => i <= cellIndex
        )
      }
    }
  }

  onInput({ field, value }: { field: 'color'|'width', value: any }) {
    this.lineForm[field] = value
  }
}

export default CosmeticLineController
