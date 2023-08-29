import SettingModeController from './setting-mode-controller'
import { PuzzleSolveCell } from '@/types'
import type { Cage, Color, Address } from '@/graphql/generated/types'
import CosmeticCageControl from '@/components/player/setter-controls/CosmeticCageControl.vue'

class CosmeticCageController extends SettingModeController {
  controllerVue = () => ({ component: CosmeticCageControl })

  cageForm = {
    textColor: { red: 0, green: 0, blue: 0, opacity: 1 },
    cageColor: { red: 0, green: 0, blue: 0, opacity: 1 },
  } as Record<'textColor'|'cageColor', Color>

  inputTarget = null as null|Cage
  inputTargetChangeListeners = [] as Array<Function>
  removeOnMouseup = null as null|Address
  draggingCells = null as null|Array<Address>

  addListener(listener: Function) {
    this.inputTargetChangeListeners.push(listener)
  }

  onReset() {
    this.inputTarget = null
    this.removeOnMouseup = null
    this.inputTargetChangeListeners = []
  }

  events = {
    mouseup: () => {
      if (this.removeOnMouseup) {
        const removeCheck = { ...this.removeOnMouseup }
        setTimeout(() => {
          if (!this.removeOnMouseup) return

          if (this.addressesAreEqual(removeCheck, this.removeOnMouseup)) {
            const clickedCageIndex = this.cages.findIndex(
              ({ cells }) => cells.some((address) => this.addressesAreEqual(address, this.removeOnMouseup!))
            )
  
            if (clickedCageIndex >= 0) {
              this.cages.splice(clickedCageIndex, 1)
            }
          }

          this.removeOnMouseup = null
        }, 100)
      } else if (this.draggingCells) {
        const newTarget = this.cages.find(({ cells }) => cells.every(
          (cell, i) => this.addressesAreEqual(cell, this.draggingCells![i]),
        ))

        if (newTarget) {
          this.inputTarget = newTarget
        }

        this.draggingCells = null
      }
    },
    keydown: (event: KeyboardEvent) => {
      if (!this.inputTarget) return
      if (event.code === 'Backspace') {
        this.input({ field: 'text', value: 'delete' })
      } else if (event.key.length === 1) {
        this.input({ field: 'text', value: event.key })
      }
    }
  }

  get cages() {
    const list = this.puzzle.puzzleData.cosmetics.cages

    if (!list) {
      throw new Error('Cages should be defined')
    }

    return list!
  }

  onCellClick(cell: PuzzleSolveCell) {
    this.inputTarget = null
    const clickedCageIndex = this.cages.findIndex(
      ({ cells }) => cells.some((address) => this.addressesAreEqual(address, cell.address)),
    )

    if (clickedCageIndex >= 0) {
      this.removeOnMouseup = cell.address
      this.draggingCells = this.cages[clickedCageIndex].cells
    } else {
      const newCage = {
        ...this.cageForm,
        cells: [cell.address],
      }

      this.draggingCells = newCage.cells
      this.cages.push(newCage)
    }
  }

  onCellDoubleClick(cell: PuzzleSolveCell) {
    this.removeOnMouseup = null
    const cageIndex = this.cages.findIndex(
      ({ cells }) => cells.some(
        (address) => this.addressesAreEqual(address, cell.address),
      )
    )

    if (cageIndex >= 0) {
      this.inputTarget = this.cages[cageIndex]
      this.cageForm = {
        textColor: this.inputTarget.textColor || { red: 0, green: 0, blue: 0, opacity: 1 },
        cageColor: this.inputTarget.cageColor,
      }
      this.inputTargetChangeListeners.forEach((listener) => listener())
    }
  }

  onCellEnter(cell: PuzzleSolveCell) {
    this.removeOnMouseup = null
    if (this.draggingCells) {
      const cellInCage = this.draggingCells.some(
        (address) => this.addressesAreEqual(address, cell.address)
      )

      if (!cellInCage) {
        const cellIsANeighbor = Object.values(cell.neighbors).some(
          (neighbor) => {
            if (!neighbor) return false
            return this.draggingCells!.some(
              (address) => this.addressesAreEqual(address, neighbor.address)
            )
          },
        )

        if (!cellIsANeighbor) return
        this.draggingCells.push(cell.address)
      }
    }
  }

  onInput(input: { field: string, value: any }) {
    switch (input.field) {
      case 'textColor': {
        this.cageForm.textColor = input.value
        if (this.inputTarget) {
          this.inputTarget.textColor = input.value
        }
        break
      }
      case 'cageColor': {
        this.cageForm.cageColor = input.value
        if (this.inputTarget) {
          this.inputTarget.cageColor = input.value
        }
        break
      }
      case 'text': {
        if (!this.inputTarget) return

        if (input.value === 'delete') {
          if (this.inputTarget.text?.length) {
            this.inputTarget.text = this.inputTarget.text.substring(0, this.inputTarget.text.length - 1)
            if (this.inputTarget.text.length === 0) {
              delete this.inputTarget.text
            }
          }
        } else {
          this.inputTarget.text = `${this.inputTarget.text || ''}${input.value}`
        }
        break
      }
      default:
        throw new Error('Unknown input field')
    }

  }
}

export default CosmeticCageController
