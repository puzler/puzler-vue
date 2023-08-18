import SettingModeController from './setting-mode-controller'
import { Cell, type Arrow } from '@/types'

class ArrowController extends SettingModeController {
  currentArrow = null as null|Arrow
  draggingBulb = null as null|boolean
  removeOnMouseup = null as null|string

  events = {
    mouseup: () => {
      this.currentArrow = null
      this.draggingBulb = null

      if (this.removeOnMouseup && this.puzzle?.arrows) {
        const didRemove = false
        this.puzzle.arrows = this.puzzle.arrows.reduce(
          (newArrows, arrow) => {
            if (didRemove) return [...newArrows, arrow]

            if (arrow.cells.includes(this.removeOnMouseup!)) {
              return newArrows
            }

            const clickedLineIndex = arrow.lines.findIndex(
              (line) => line.includes(this.removeOnMouseup!)
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

  onCellClick(cell: Cell) {
    if (this.puzzle?.arrows) {
      const clickedBulb = this.puzzle.arrows.find(
        (arrow) => arrow.cells.includes(cell.address)
      )

      if (clickedBulb) {
        this.removeOnMouseup = cell.address
        this.currentArrow = clickedBulb
        this.draggingBulb = false
        this.currentArrow.lines.push([cell.address])
        return
      }

      const clickedLineOf = this.puzzle.arrows.find(
        (arrow) => arrow.lines.some(
          (line) => line.includes(cell.address),
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

      this.puzzle.arrows.push({
        cells: [cell.address],
        lines: [],
      })
      this.currentArrow = this.puzzle.arrows[this.puzzle.arrows.length - 1]
      this.draggingBulb = true
    }
  }

  onCellEnter(cell: Cell) {
    this.removeOnMouseup = null
    if (!this.currentArrow) return

    if (this.draggingBulb) {
      const cellBulbIndex = this.currentArrow.cells.indexOf(cell.address)
      if (cellBulbIndex >= 0) {
        this.currentArrow.cells = this.currentArrow.cells.filter(
          (_, i) => i <= cellBulbIndex
        )
      } else {
        this.currentArrow.cells.push(cell.address)
      }
    } else {
      const currentLine = this.currentArrow.lines[this.currentArrow.lines.length - 1]
      const cellLineIndex = currentLine.indexOf(cell.address)
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

export default new ArrowController()
