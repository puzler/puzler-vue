import SettingModeController from './setting-mode-controller'
import { PuzzleSolve, PuzzleSolveCell } from '@/types'
import type {
  CosmeticShape,
  CosmeticShapeInput,
  Address,
} from '@/graphql/generated/types'
import CosmeticShapeControl from '@/components/player/setter-controls/CosmeticShapeControl.vue'

class CosmeticShapeController extends SettingModeController {
  shapeType: 'Circles'|'Rectangles'
  constructor(puzzle: PuzzleSolve, { shapeType }: { shapeType: 'Circles'|'Rectangles' }) {
    super(puzzle)
    this.shapeType = shapeType
  }

  shapeForm = {
    address: { row: 0, column: 0 },
    text: '',
    textColor: { red: 0, green: 0, blue: 0, opacity: 1 },
    fillColor: { red: 255, green: 255, blue: 255, opacity: 1 },
    outlineColor: { red: 0, green: 0, blue: 0, opacity: 1 },
    width: 0.5,
    height: 0.5,
    angle: 0,
  } as CosmeticShapeInput

  inputTarget = null as null|CosmeticShape
  inputTargetChangeListeners = [] as Array<Function>
  removeCheck = null as null|Address

  addListener(listener: Function) {
    this.inputTargetChangeListeners.push(listener)
  }

  onReset() {
    this.inputTargetChangeListeners
  }

  controllerVue = () => ({
    component: CosmeticShapeControl,
    props: {
      selectedShape: this.inputTarget,
      formValues: this.shapeForm,
    }
  })

  onInput({ field, value }: { field: string, value: any }) {
    const form = this.shapeForm as Record<string, any>
    if (form[field] !== undefined) {
      if (field === 'address') {
        form.address = {
          ...form.address,
          ...value,
        }
      } else {
        form[field] = value
      }

      if (this.inputTarget) {
        if (field === 'address') {
          this.inputTarget.address = {
            ...this.inputTarget.address,
            ...value,
          }
        } else {
          const target = this.inputTarget as Record<string, any>
          target[field] = value
        }
      }
    }
  }

  get itemsKey() {
    switch (this.shapeType) {
      case 'Circles': return 'circles'
      case 'Rectangles': return 'rectangles'
    }

    throw new Error('Unknown shape Type')
  }

  get items() {
    const list = this.puzzle.puzzleData.cosmetics[this.itemsKey]
    if (!list) {
      throw new Error('List should be defined')
    }

    return list
  }

  draggingCells = null as null|Array<Address>
  reselecting = false

  centerOfAddresses(addresses: Array<Address>) {
    const { rows, columns } = addresses.reduce(
      ({ rows, columns }, { row, column }) => ({
        rows: [...rows, row],
        columns: [...columns, column],
      }),
      { rows: [], columns: [] } as { rows: Array<number>, columns: Array<number> },
    )

    const midPoint = (numbers: Array<number>) => {
      const { min, max } = numbers.reduce(
        ({ min, max }, number) => {
          return {
            min: Math.min(min, number),
            max: Math.max(max, number),
          }
        },
        { min: Infinity, max: -Infinity },
      )
      return (min + max) / 2.0
    }

    return {
      row: midPoint(rows),
      column: midPoint(columns),
    }
  }

  bounceItem(index: number) {
    const target = this.items[index]
    if (target) {
      target.width += 0.05
      target.height += 0.05
      setTimeout(() => {
        target.height -= 0.05
        target.width -= 0.05
      }, 255)
    }
  }

  removeItem(index: number) {
    this.items.splice(index, 1) 
  }

  selectItem(index: number) {
    const target = this.items[index]

    if (target) {
      this.inputTarget = target
      this.shapeForm = JSON.parse(JSON.stringify(target))

      this.inputTargetChangeListeners.forEach(
        (func) => func()
      )
    }
  }

  onCellClick(cell: PuzzleSolveCell) {
    const clickedIndex = this.items.findIndex(
      ({ address }) => this.addressesAreEqual(address, cell.address)
    )

    if (clickedIndex === -1) {
      const newItem = {
        ...this.shapeForm,
        address: { ...cell.address, __typename: 'Address' },
      } as CosmeticShape

      this.items.push(newItem)
      this.selectItem(this.items.length - 1)
    }
  }
}

export default CosmeticShapeController
