import SettingModeController from './setting-mode-controller'
import type { PuzzleSolveCell } from '..'
import type { Address, Text } from '@/graphql/generated/types'
import CosmeticTextControl from '@/components/player/setter-controls/CosmeticTextControl.vue'

class CosmeticTextController extends SettingModeController {
  formListeners = [] as Array<Function>
  addListener(listener: Function) {
    this.formListeners.push(listener)
  }

  onReset() {
    this.formListeners = []
    this.draggingOrigin = null
    this.draggingTarget = null
    this.reselecting = false
  }

  controllerVue = () => ({ component: CosmeticTextControl })

  get list() {
    const texts = this.puzzle.puzzleData.cosmetics.text

    if (!texts) {
      throw new Error('Text should be defined')
    }

    return texts
  }

  events = {
    mouseup: () => {
      if (this.dragTargetAddress) {
        const doubleCheck = this.reselecting
        setTimeout(() => {
          if (this.reselecting === doubleCheck && this.dragTargetAddress) {
            const existingTargetIndex = this.list.findIndex(
              ({ address }) => this.addressesAreEqual(address, this.dragTargetAddress!)
            )
    
            if (existingTargetIndex === -1) {
              const newText = {
                ...this.textForm,
                address: this.dragTargetAddress,
              } as Text

              this.list.push(newText)
              this.inputTarget = newText
              this.formListeners.forEach((listener) => listener())
            } else if (this.reselecting) {
              this.inputTarget = this.list[existingTargetIndex]
              this.textForm = {
                fontColor: this.inputTarget.fontColor || { red: 0, green: 0, blue: 0, opacity: 1 },
                size: this.inputTarget.size,
                angle: this.inputTarget.angle || 0,
              }
              this.formListeners.forEach((listener) => listener())
            } else {
              this.list.splice(existingTargetIndex, 1)
              this.formListeners.forEach((listener) => listener())
            }

            this.reselecting = false
            this.draggingOrigin = null
            this.draggingTarget = null
          }
        }, 100)
      }
    },
    keydown: (event: KeyboardEvent) => {
      if (this.inputTarget && !(event.target instanceof HTMLInputElement)) {
        if (event.code === 'Backspace') {
          this.input({ field: 'text', value: 'delete' })
        } else if (event.key.length === 1) {
          this.input({ field: 'text', value: event.key })
        }
      }
    },
  }

  reselecting = false
  draggingOrigin = null as null|Address
  draggingTarget = null as null|Address
  inputTarget = null as null|Text

  textForm = {
    fontColor: { red: 0, green: 0, blue: 0, opacity: 1 },
    size: 0.5,
    angle: 0,
  }

  get dragTargetAddress() {
    if (!this.draggingOrigin) return
    if (!this.draggingTarget) return { ...this.draggingOrigin, __typename: 'Address' } as Address

    return {
      row: (this.draggingOrigin.row + this.draggingTarget.row) / 2.0,
      column: (this.draggingOrigin.column + this.draggingTarget.column) / 2.0,
      __typename: 'Address',
    } as Address
  }

  onCellClick(cell: PuzzleSolveCell) {
    this.inputTarget = null
    this.draggingOrigin = cell.address
  }

  onCellEnter(cell: PuzzleSolveCell) {
    if (this.draggingOrigin) {
      if (this.addressesAreEqual(this.draggingOrigin, cell.address)) {
        this.draggingTarget = null
      } else {
        if (Math.abs(cell.address.row - this.draggingOrigin.row) > 1) return
        if (Math.abs(cell.address.column - this.draggingOrigin.column) > 1) return

        this.draggingTarget = cell.address
      }
    }
  }

  onCellDoubleClick(cell: PuzzleSolveCell) {
    this.draggingOrigin = cell.address
    this.reselecting = true
  }

  onInput({ field, value }: { field: string; value: any }) {
    const form = this.textForm as Record<string, any>
    const target = this.puzzle.puzzleData.cosmetics.text?.find(
      ({ address }) => this.inputTarget && this.addressesAreEqual(this.inputTarget.address, address)
    ) as Record<string, any>

    if (form[field] !== undefined) {
      form[field] = value

      if (target) {
        target[field] = value
      }
    } else if (field === 'address') {
      if (target) {
        target.address = {
          ...target.address,
          ...value,
        }
      }
    } else if (field === 'text') {
      if (target) {
        if (value === 'delete') {
          if (target.text?.length) {
            target.text = target.text.substring(0, target.text.length - 1)
            if (target.text.length === 0) {
              delete target.text
            }
          }
        } else {
          target.text ||= ''
          target.text += value
        }
      }
    }
  }
}

export default CosmeticTextController
