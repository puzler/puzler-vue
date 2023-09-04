import SettingModeController from './setting-mode-controller'
import { PuzzleSolveCell } from '@/types'
import type {
  Arrow,
  Address,
} from '@/graphql/generated/types'

class ArrowController extends SettingModeController {
  currentArrow = null as null|Arrow
  draggingBulb = null as null|boolean
  removeOnMouseup = null as null|Address

  get arrows() {
    return this.puzzle?.puzzleData?.localConstraints.arrows
  }

  events = {
    mouseup: () => {
      if (this.currentArrow)  this.triggerChangeListeners()
      this.currentArrow = null
      this.draggingBulb = null

      if (this.removeOnMouseup && this.arrows) {
        const didRemove = false
        this.puzzle!.puzzleData!.localConstraints.arrows = this.arrows.reduce(
          (newArrows, arrow) => {
            if (didRemove) return [...newArrows, arrow]

            const removeBulb = arrow.cells.some(
              (address) => this.addressesAreEqual(address, this.removeOnMouseup!)
            )
            if (removeBulb) return newArrows

            const clickedLineIndex = arrow.lines.findIndex(
              (line) => line.some((address) => this.addressesAreEqual(address, this.removeOnMouseup!)),
            )
            if (clickedLineIndex === -1) return [...newArrows, arrow]

            return [
              ...newArrows,
              {
                cells: arrow.cells,
                lines: arrow.lines.slice(0, -1).filter(
                  (_, i) => i !== clickedLineIndex,
                ),
              },
            ]
          },
          [] as Array<Arrow>
        )
        this.triggerChangeListeners()
      }

      this.removeOnMouseup = null
    }
  }

  onReset() {
    this.currentArrow = null
    this.draggingBulb = null
  }

  onSetup() {
    this.currentArrow = null
    this.draggingBulb = null
  }

  onCellClick(cell: PuzzleSolveCell) {
    if (this.arrows) {
      const clickedBulb = this.arrows.find(
        (arrow) => arrow.cells.some(
          (address) => this.addressesAreEqual(address, cell.address),
        )
      )

      if (clickedBulb) {
        this.removeOnMouseup = cell.address
        this.currentArrow = clickedBulb
        this.draggingBulb = false
        this.currentArrow.lines.push([cell.address])
        return
      }

      const clickedLineOf = this.arrows.find(
        (arrow) => arrow.lines.some(
          (line) => line.some(
            (address) => this.addressesAreEqual(address, cell.address),
          ),
        ),
      )

      if (clickedLineOf) {
        this.removeOnMouseup = cell.address
        this.currentArrow = clickedLineOf
        this.draggingBulb = false
        const currentLineIndex = clickedLineOf.lines.findIndex(
          (line) => line.includes(cell.address),
        )
        const currentLine = clickedLineOf.lines[currentLineIndex]!
        const cellIndex = currentLine.indexOf(cell.address)

        if (cellIndex === currentLine.length - 1) {
          this.currentArrow.lines = [
            ...this.currentArrow.lines.filter(
              (_, i) => i !== currentLineIndex,
            ),
            currentLine,
          ]
        } else {
          this.currentArrow.lines.push([
            ...currentLine.slice(0, cellIndex + 1),
          ])
        }
        return
      }

      this.arrows.push({
        cells: [cell.address],
        lines: [],
      })
      this.currentArrow = this.arrows[this.arrows.length - 1]
      this.draggingBulb = true
    }
  }

  onCellEnter(cell: PuzzleSolveCell) {
    this.removeOnMouseup = null
    if (!this.currentArrow) return

    if (this.draggingBulb) {
      const cellBulbIndex = this.currentArrow.cells.findIndex(
        (address) => this.addressesAreEqual(address, cell.address),
      )
      if (cellBulbIndex >= 0) {
        this.currentArrow.cells = this.currentArrow.cells.filter(
          (_, i) => i <= cellBulbIndex
        )
      } else {
        this.currentArrow.cells.push(cell.address)
      }
    } else {
      const currentLine = this.currentArrow.lines[this.currentArrow.lines.length - 1]
      const cellLineIndex = currentLine.findIndex(
        (address) => this.addressesAreEqual(address, cell.address),
      )
      if (cellLineIndex >= 0) {
        this.currentArrow.lines = [
          ...this.currentArrow.lines.slice(0, -1),
          currentLine.filter((_, i) => i <= cellLineIndex),
        ]
      } else {
        currentLine.push(cell.address)
      }
    }
  }
}

export default ArrowController
