import type { PuzzleSolve, PuzzleSolveCell } from '@/types'
import SettingModeController from './setting-mode-controller'
import type { Line, Address } from '@/graphql/generated/types'

class LineController extends SettingModeController {
  lineType: string

  constructor(puzzle: PuzzleSolve, { lineType }: { lineType: string }) {
    super(puzzle)
    this.lineType = lineType
  }

  currentLine = null as null|Line
  removeOnMouseup = null as null|Address

  get lineKey() {
    switch (this.lineType) {
      case 'Palindrome Lines': return 'palindromeLines'
      case 'Renban Lines': return 'renbanLines'
      case 'German Whispers': return 'germanWhisperLines'
      case 'Dutch Whispers': return 'dutchWhisperLines'
      case 'Region Sums': return 'regionSumLines'
      case 'Between Lines': return 'betweenLines'
    }

    throw new Error('Unknown Line Type')
  }

  get lineMinLength() {
    if (this.lineType === 'Between Lines') return 3
    return 2
  }

  get lines(): null|undefined|Array<Line> {
    return this.puzzle.puzzleData.localConstraints[this.lineKey]
  }

  events = {
    mouseup: () => {
      if (this.removeOnMouseup && this.lines) {
        let didRemove = false

        if (this.currentLine) {
          this.puzzle.puzzleData.localConstraints[this.lineKey]!.pop()
        }

        this.puzzle.puzzleData.localConstraints[this.lineKey] = this.lines.reduce(
          (newLines, line) => {
            if (didRemove) return [...newLines, line]

            if (line.points.some((address) => this.addressesAreEqual(address, this.removeOnMouseup!))) {
              didRemove = true
              return newLines
            }

            return [
              ...newLines,
              line,
            ]
          },
          [] as Array<Line>
        )
      }

      // on mouseup remove any lines that are shorter than the min length
      if (this.lines) {
        this.puzzle.puzzleData.localConstraints[this.lineKey] = this.lines.filter(
          ({ points }) => points.length >= this.lineMinLength
        ) as Array<Line>
      }

      this.removeOnMouseup = null
      this.currentLine = null
    }
  }

  onReset() {
    this.currentLine = null
  }

  onSetup() {
    this.currentLine = null
  }

  onCellClick(cell: PuzzleSolveCell) {
    console.log('onClick', this.lineKey, this.lines)
    if (this.lines) {
      this.removeOnMouseup = cell.address

      const newLine = { points: [cell.address] }
      this.currentLine = newLine
      this.lines.push(newLine)
    }
  }

  onCellEnter(cell: PuzzleSolveCell) {
    this.removeOnMouseup = null
    if (this.currentLine) {
      const cellIndex = this.currentLine.points.findIndex(
        ({ row, column }) => cell.address.row === row && cell.address.column === column
      )

      if (cellIndex === -1) {
        this.currentLine.points.push(cell.address)
      } else {
        this.currentLine.points = this.currentLine.points.filter(
          (_, i) => i <= cellIndex,
        )
      }
    }
  }
}

export default LineController
