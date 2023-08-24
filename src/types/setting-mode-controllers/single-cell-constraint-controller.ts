import { PuzzleSolve, PuzzleSolveCell } from '@/types'
import SettingModeController from './setting-mode-controller'

class SingleCellConstraintController extends SettingModeController {
  constraintType: string
  constructor(puzzle: PuzzleSolve, { constraintType }: { constraintType: string }) {
    super(puzzle)
    this.constraintType = constraintType
  }

  get constraintKey() {
    switch (this.constraintType) {
      case 'Odd Cells': return 'oddCells'
      case 'Even Cells': return 'evenCells'
      case 'Minimums': return 'minCells'
      case 'Maximums': return 'maxCells'
      case 'Row Index Cells': return 'rowIndexCells'
      case 'Column Index Cells': return 'columnIndexCells'
    }

    throw new Error('Unknown single cell constraint type')
  }

  get currentList() {
    return this.puzzle.puzzleData.localConstraints[this.constraintKey]
  }

  onCellClick(cell: PuzzleSolveCell) {
    if (this.currentList) {
      const existingIndex = this.currentList?.findIndex(
        (element) => this.addressesAreEqual(cell.address, element.cell)
      )
  
      if (existingIndex === -1) {
        this.currentList.push({ cell: cell.address })
      } else {
        this.currentList.splice(existingIndex, 1)
      }
    }
  }
}

export default SingleCellConstraintController
