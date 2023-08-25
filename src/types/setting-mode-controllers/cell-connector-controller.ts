import SettingModeController from './setting-mode-controller'
import { PuzzleSolve, PuzzleSolveCell } from '@/types'
import { XvTypes } from '@/graphql/generated/types'
import type { Address, CellConnector, DifferenceDot, Quadruple, RatioDot, Xv } from '@/graphql/generated/types'
import NumpadControl from '@/components/player/setter-controls/NumpadControl.vue'

class CellConnectorController extends SettingModeController {
  connectorType: string
  constructor(puzzle: PuzzleSolve, { connectorType }: { connectorType: string }) {
    super(puzzle)
    this.connectorType = connectorType
  }

  get constraintKey() {
    switch (this.connectorType) {
      case 'Difference Dots': return 'differenceDots'
      case 'Ratio Dots': return 'ratioDots'
      case 'XV': return 'xv'
      case 'Quadruples': return 'quadruples'
    }

    throw new Error('Unknown connector type')
  }

  controllerVue = () => {
    let numpad = [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9,
      0, null, 'delete',
    ]

    if (this.connectorType === 'XV') {
      numpad = [XvTypes.X, XvTypes.V, 'delete']
    }

    return {
      component: NumpadControl,
      props: { numpad },
    }
  }

  emptyConnectorData() {
    if (this.connectorType === 'Quadruples') return { values: [] }
    return {}
  }

  get connectorCellsLength() {
    if (this.connectorType === 'Quadruples') return 3
    return 2 
  }

  get connectors(): undefined|null|Array<CellConnector> {
    return this.puzzle.puzzleData.localConstraints[this.constraintKey]
  }

  connectorCells = null as null|Array<Address>
  tempConnector = null as null|CellConnector
  removedConnector = null as null|CellConnector
  inputTarget = null as null|CellConnector

  events = {
    mouseup: () => {
      this.connectorCells = null
      if (this.removedConnector) {
        this.removedConnector = null
        this.inputTarget = null
      }
      if (this.tempConnector){
        this.inputTarget = this.tempConnector
        this.tempConnector = null
      }
    },
    keydown: (event: KeyboardEvent) => {
      if (/^(Digit|Numpad)\d$/.test(event.code)) {
        this.input(parseInt(event.code.charAt(event.code.length - 1), 10))
      } else if (/^Key(X|V)$/.test(event.code)) {
        this.input(event.code.charAt(event.code.length - 1))
      } else if (event.code === 'Backspace') {
        this.input('delete')
      }
    },
  }

  onReset() {
    this.connectorCells = null
    this.removedConnector = null
    this.tempConnector = null
    this.inputTarget = null
  }

  onSetup() {
    this.connectorCells = null
    this.removedConnector = null
    this.tempConnector = null
    this.inputTarget = null
  }

  locationForAddresses(addresses: Array<Address>) {
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

  onCellClick(cell: PuzzleSolveCell) {
    this.connectorCells = [cell.address]
  }

  onCellEnter(cell: PuzzleSolveCell) {
    if (!this.connectors) return
    if (!this.connectorCells?.length) return

    const cellIndexInConnector = this.connectorCells.findIndex(
      (address) => this.addressesAreEqual(address, cell.address)
    )

    if (cellIndexInConnector >= 0 && cellIndexInConnector < this.connectorCells.length - 1) {
      if (this.tempConnector) {
        this.connectors.pop()
        this.tempConnector = null
      } else if (this.removedConnector) {
        this.connectors.push(this.removedConnector)
        this.removedConnector = null
      }

      this.connectorCells = this.connectorCells.filter(
        (_, i) => i <= cellIndexInConnector
      )
    } else if (this.connectorCells.length >= this.connectorCellsLength) {
      return
    } else {
      const lastAddress = this.connectorCells[this.connectorCells.length - 1]

      const cellIsNeighborOfLast = Object.values(cell.neighbors).some(
        (cell) => {
          if (!cell) return false
          return this.addressesAreEqual(lastAddress, cell.address)
        }
      )
      if (!cellIsNeighborOfLast) return

      if (this.connectorCells.length > 1) {
        const cellIsAdjacentToAll = this.connectorCells.slice(0, -1).every(
          (address) => {
            if (Math.abs(address.row - cell.address.row) > 1) return false
            if (Math.abs(address.column - cell.address.column) > 1) return false

            return true
          }
        )

        if (!cellIsAdjacentToAll) return
      }

      this.connectorCells.push(cell.address)
      if (this.connectorCells.length === this.connectorCellsLength) {
        const location = this.locationForAddresses(this.connectorCells)
        const indexToRemove = this.connectors.findIndex(
          (connector) => this.addressesAreEqual(connector.location, location)
        )

        if (indexToRemove >= 0) {
          this.removedConnector = this.connectors.splice(indexToRemove, 1)[0]
        } else {
          this.tempConnector = {
            cells: this.connectorCells,
            location,
            ...this.emptyConnectorData(),
          }
          this.connectors.push(this.tempConnector!)
        }
      }
    }
  }

  onInput(input: number|string) {
    if (!this.inputTarget) return
    if (!this.connectors) return

    const target = (this.puzzle.puzzleData.localConstraints[this.constraintKey]! as Array<CellConnector>).find(
      (connector) => this.addressesAreEqual(connector.location, this.inputTarget!.location)
    )!
    
    switch (this.connectorType) {
      case 'Difference Dots': {
        const dot = target as DifferenceDot
        if (typeof input === 'number') {
          dot.difference = input
        } else if (input === 'delete') {
          delete dot.difference
        }
        break
      }
      case 'Ratio Dots': {
        const dot = target as RatioDot
        if (typeof input === 'number') {
          dot.ratio = input
        } else if (input === 'delete') {
          delete dot.ratio
        }
        break
      }
      case 'XV': {
        const xv = target as Xv
        if (input === 'delete') {
          delete xv.xvType
        } else if (input === XvTypes.X || input === XvTypes.V) {
          xv.xvType = input as XvTypes
        }
        break
      }
      case 'Quadruples': {
        const quadruple = target as Quadruple
        if (input === 'delete' && quadruple.values.length) {
          quadruple.values.pop()
        } else if (typeof input === 'number') {
          if (quadruple.values.length < 4) {
            quadruple.values = [
              ...quadruple.values,
              input,
            ].sort()
          }
        }
        break
      }
    }
  }
}

export default CellConnectorController
