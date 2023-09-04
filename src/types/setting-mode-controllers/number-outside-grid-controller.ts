import SettingModeController from './setting-mode-controller'
import { PuzzleSolve, PuzzleSolveCell } from '@/types'
import type { Address, NumberOutsideGrid } from '@/graphql/generated/types'
import NumpadControl from '@/components/player/setter-controls/NumpadControl.vue'

class NumberOutsideGridController extends SettingModeController {
  constraintType: string
  constructor(puzzle: PuzzleSolve, { constraintType }: { constraintType: string }) {
    super(puzzle)
    this.constraintType = constraintType
  }

  inputTarget = null as null|NumberOutsideGrid

  get constraintKey() {
    switch (this.constraintType) {
      case 'Sandwich Sums': return 'sandwichSums'
      case 'Skyscrapers': return 'skyscrapers'
      case 'X-Sums': return 'xSums'
    }

    throw new Error('Unknown constraint type')
  }

  get constraintList(): Array<NumberOutsideGrid> {
    return this.puzzle.puzzleData.localConstraints[this.constraintKey]!
  }

  controllerVue = () => ({
    component: NumpadControl,
    props: {
      numpad: [
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
        0, null, 'delete',
      ]
    }
  })

  onSetup() {
    this.puzzle.gridOuterCells = true
    this.inputTarget = null
    this.removing = null
  }

  onReset() {
    this.puzzle.gridOuterCells = false
    this.inputTarget = null
    this.removing = null
  }

  removing = null as null|Address

  events = {
    keydown: (event: KeyboardEvent) => {
      if (this.inputTarget) {
        if (event.code === 'Backspace') {
          this.input('delete')
        } else if (/^(Digit|Numpad)\d$/.test(event.code)) {
          this.input(parseInt(event.code.charAt(event.code.length - 1), 10))
        }
      }
    }
  }

  onCellClick(cell: PuzzleSolveCell) {
    const { row, column } = cell.address
    const verticalOuter = row === -1 || row === this.puzzle.size
    const horizontalOuter = column === -1 || column === this.puzzle.size

    if (!verticalOuter && !horizontalOuter) return
    if (row < -1 || row > this.puzzle.size) return
    if (column < -1 || column > this.puzzle.size) return

    const existingElementIndex = this.constraintList.findIndex(
      ({ location }) => this.addressesAreEqual(location, cell.address)
    )

    if (existingElementIndex === -1) {
      const newItem = {
        location: cell.address
      }
      this.constraintList.push(newItem)
      this.inputTarget = newItem
      this.triggerChangeListeners()
    } else {
      this.inputTarget = null
      this.removing = cell.address
      setTimeout(
        () => {
          if (this.removing && this.addressesAreEqual(this.removing, cell.address)) {
            this.constraintList.splice(existingElementIndex, 1)
            this.triggerChangeListeners()
          }
        },
        150,
      )
    }
  }

  onCellDoubleClick(cell: PuzzleSolveCell) {
    this.removing = null
    const clickedItem = this.constraintList.find(
      ({ location }) => this.addressesAreEqual(cell.address, location)
    )

    if (clickedItem) {
      this.inputTarget = clickedItem
    }
  }

  onInput(input: number|'delete') {
    if (!this.inputTarget) return

    const itemList = this.puzzle.puzzleData.localConstraints[this.constraintKey] as Array<NumberOutsideGrid>
    const target = itemList.find(
      ({ location }) => this.addressesAreEqual(this.inputTarget!.location, location)
    )!

    if (input === 'delete') {
      if (typeof target.value === 'number') {
        const valStr = target.value.toString()
        if (valStr.length === 1) {
          delete target.value
        } else {
          target.value = parseInt(valStr.substring(0, valStr.length - 1))
        }
      }
    } else {
      const valStr = target.value?.toString() || ''
      target.value = parseInt(`${valStr}${input}`, 10)
    }
  }
}

export default NumberOutsideGridController
