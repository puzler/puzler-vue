import SettingModeController from './setting-mode-controller'
import { PuzzleSolveCell } from '@/types'
import type { LittleKillerSum, Address } from '@/graphql/generated/types'
import NumpadControl from '@/components/player/setter-controls/NumpadControl.vue'

class LittleKillerController extends SettingModeController {
  controllerVue = () => ({
    component: NumpadControl,
    props: {
      numpad: [
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
        0, null, 'delete',
      ],
    },
  })

  draggingOrigin = null as null|Address
  removeOnMouseup = null as null|Address
  inputTarget = null as null|LittleKillerSum

  onSetup() {
    this.puzzle.gridOuterCells = true
  }

  onReset() {
    this.puzzle.gridOuterCells = false
    this.draggingOrigin = null
    this.removeOnMouseup = null
    this.inputTarget = null
  }

  get constraintList() {
    return this.puzzle.puzzleData.localConstraints.littleKillerSums
  }

  events = {
    mouseup: () => {
      if (this.removeOnMouseup) {
        const timeoutAddress = { ...this.removeOnMouseup }
        setTimeout(
          () => {
            if (this.constraintList) {
              if (this.removeOnMouseup && this.addressesAreEqual(timeoutAddress, this.removeOnMouseup)) {
                const indexToRemove = this.constraintList.findIndex(
                  ({ location }) => this.addressesAreEqual(location, this.removeOnMouseup!)
                )

                if (indexToRemove !== -1) {
                  this.constraintList.splice(indexToRemove, 1)
                }
              }
            }

            this.removeOnMouseup = null
          },
          100,
        )
      } else if (this.draggingOrigin) {
        if (this.constraintList) {
          const itemToTarget = this.constraintList.find(
            ({ location }) => this.addressesAreEqual(location, this.draggingOrigin!)
          )

          if (itemToTarget) {
            this.inputTarget = itemToTarget
          }
        }
      }

      this.draggingOrigin = null
    },
    keydown: (event: KeyboardEvent) => {
      if (this.inputTarget) {
        if (event.code === 'Backspace') {
          this.input('delete')
        } else if (/^(Digit|Numpad)\d$/.test(event.code)) {
          this.input(parseInt(event.code.charAt(event.code.length - 1), 10))
        }
      }
    },
  }

  onCellClick({ address }: PuzzleSolveCell) {
    if (this.constraintList) {
      const { row, column } = address
      const verticalOuter = row === -1 || row === this.puzzle.size
      const horizontalOuter = column === -1 || column === this.puzzle.size
      if (!verticalOuter && !horizontalOuter) return
      if (row < -1 || row > this.puzzle.size) return
      if (column < -1 || column > this.puzzle.size) return

      this.draggingOrigin = address
      this.removeOnMouseup = address
    }
  }

  onCellEnter({ address }: PuzzleSolveCell) {
    this.removeOnMouseup = null
    if (this.constraintList && this.draggingOrigin) {
      const horizontalDiff = Math.abs(address.column - this.draggingOrigin.column)
      const verticalDiff = Math.abs(address.row - this.draggingOrigin.row)
      if (horizontalDiff !== 1 || verticalDiff !== 1) return
      if (address.row < 0 || address.row > this.puzzle.size - 1) return
      if (address.column < 0 || address.column > this.puzzle.size - 1) return

      const existingElementIndex = this.constraintList.findIndex(
        ({ location }) => this.addressesAreEqual(location, this.draggingOrigin!)
      )

      if (existingElementIndex === -1) {
        const newSum = {
          location: this.draggingOrigin,
          direction: {
            top: address.row < this.draggingOrigin.row,
            left: address.column < this.draggingOrigin.column,
          }
        }
        this.constraintList.push(newSum)
      } else {
        this.constraintList[existingElementIndex].direction = {
          top: address.row < this.draggingOrigin.row,
          left: address.column < this.draggingOrigin.column,
        }
      }
    }
  }

  onInput(input: number|'delete') {
    if (this.constraintList && this.inputTarget) {
      const target = this.constraintList.find(
        ({ location }) => this.addressesAreEqual(location, this.inputTarget!.location)
      )!

      if (input === 'delete') {
        if (typeof target.value === 'number') {
          const valStr = target.value.toString()
          const newVal = valStr.substring(0, valStr.length - 1)
          if (newVal.length) {
            target.value = parseInt(newVal, 10)
          } else {
            delete target.value
          }
        }
      } else {
        const valStr = target.value?.toString() || ''
        target.value = parseInt(`${valStr}${input}`, 10)
      }
    }
  }
}

export default LittleKillerController
