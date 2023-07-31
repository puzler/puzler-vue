import { unzip } from '@/utils/puzzleZipper'
import type {
  FPuzzle,
} from './f-puzzle'
import type {
  KillerCage,
} from './constraints'
import type {
  Text
} from './cosmetics'

export default class Puzzle {
  size: number
  cells: Array<Array<Cell>>
  selectedAddresses: Array<string> = []
  solution?: Array<number|null>
  successMessage?: string
  title?: string
  author?: string
  rules?: string
  cages?: Array<KillerCage>
  text?: Array<Text>

  constructor(size: number) {
    if (size < 1) throw 'Size must be positive'

    this.size = size
    this.cells = []

    const { height, width } = this.dimensionsForSize(size)
    const regionsPerRow = size / width

    for (let i = 0; i < size; i += 1) {
      this.cells.push([])
      for (let j = 0; j < size; j += 1) {
        const cell = new Cell({
          digit: null,
          region: (Math.floor(i / height) * regionsPerRow) + Math.floor(j / width),
          coordinates: {
            row: i,
            col: j
          }
        })

        if (i != 0) {
          cell.neighbors.up = this.cells[i - 1][j]
          this.cells[i - 1][j].neighbors.down = cell
        }

        if (j != 0) {
          cell.neighbors.left = this.cells[i][j - 1]
          this.cells[i][j - 1].neighbors.right = cell
        }

        this.cells[i].push(cell)
      }
    }
  }

  static fromBase64String(base64String: string): Puzzle {
    const unzipped = unzip(base64String)
    if (unzipped) {
      const json = JSON.parse(unzipped) as FPuzzle
      console.log(json)
      return Puzzle.fromFPuzzle(json)
    }

    return new Puzzle(9)
  }

  static fromFPuzzle(fPuzzle: FPuzzle) {
    const puzzle = new Puzzle(fPuzzle.size)

    puzzle.title = fPuzzle.title
    puzzle.author = fPuzzle.author
    puzzle.rules = fPuzzle.ruleset
    puzzle.solution = fPuzzle.solution

    fPuzzle.grid.forEach((row, i) => {
      row.forEach((cell, j) => {
        const puzzCell = puzzle.cells[i][j]
        if (cell.region !== undefined) puzzCell.region = cell.region
        if (cell.value !== undefined) puzzCell.digit = cell.value
        if (cell.given !== undefined) puzzCell.given = cell.given
      })
    })

    puzzle.cages = [
      ...fPuzzle.cage?.reduce((cages, cage) => {
          if (cage.value?.startsWith('msgcorrect')) {
            puzzle.successMessage = cage.value.replace('msgcorrect: ', '')
            return cages
          }

          return [
            ...cages,
            {
              ...cage,
              cosmetic: true,
            },
          ]
        },
        [] as Array<KillerCage>,
      ) || [],
      ...fPuzzle.killercage?.map((cage) => ({
        ...cage,
        cosmetic: false,
      })) || [],
      ...fPuzzle.extraregion?.map((region) => ({
        ...region,
        cosmetic: false,
      })) || [],
    ]

    puzzle.text = fPuzzle.text

    return puzzle
  }

  deselectAll() {
    for (let i = 0; i < this.size; i += 1) {
      for (let j = 0; j < this.size; j += 1) {
        this.cells[i][j].selected = false
      }
    }
  }

  get selectedCells(): Array<Cell> {
    return this.cells.reduce(
      (selected, row) => {
        row.forEach((cell) => {
          if (cell.selected) selected.push(cell)
        })
        return selected
      },
      [] as Array<Cell>,
    )
  }

  cellAt({ row, col }: { row: number, col: number }) {
    if (row >= this.size || col >= this.size) throw new Error('Out of bounds')
    if (row < 0 || col < 0) throw new Error('Out of bounds')

    return this.cells[row][col]
  }

  get checkGroups() {
    const rows = {} as Record<number, Array<number|null>>
    const columns = {} as Record<number, Array<number|null>>
    const regions = {} as Record<number, Array<number|null>>

    this.cells.forEach((rowCells, row) => {
      rowCells.forEach((cell, col) => {
        (rows[row] ||= []).push(cell.digit);
        (columns[col] ||= []).push(cell.digit);
        (regions[cell.region] ||= []).push(cell.digit)
      })
    })

    return {
      rows,
      columns,
      regions,
    }
  }

  get errorAddresses(): Array<string> {
    const { rows, columns, regions } = this.checkGroups
    const errors = [] as Array<string>

    this.cells.forEach((rowCells, row) => {
      rowCells.forEach((cell, col) => {
        if (cell.digit !== null) {
          const groups = [
            rows[row],
            columns[col],
            regions[cell.region],
          ]

          const duplicateFound = groups.some(
            (group) => group.filter((d) => d === cell.digit).length > 1
          )

          if (duplicateFound) errors.push(cell.address)
        }
      })
    })

    return errors
  }

  checkSolution(): boolean {
    if (this.solution === this.digits) {
      return true
    }

    return Object.values(this.checkGroups).every(
      (groupType) => Object.values(groupType).every(
        (group) => group.every(
          (digit, i) => digit !== null && group.indexOf(digit) === i,
        ),
      ),
    )
  }

  get digits(): Array<number|null> {
    return this.cells.flatMap((row) => row.map((cell) => cell.digit))
  }

  private dimensionsForSize(size: number): { width: number; height: number } {
    const factors = []
    for (let i = 1; i <= Math.floor(Math.sqrt(size)); i += 1) {
      if ((size % i) === 0) {
        factors.push(i)
        if (size / i !== i) factors.push(size / i)
      }
    }
    factors.sort((a, b) => a - b)

    return {
      width: factors[Math.ceil((factors.length - 1) / 2)],
      height: factors[Math.floor((factors.length - 1) / 2)],
    }
  }

  get hasOuterElements() {
    const hasOuterText = this.text?.some(({ cells }) => {
      return cells.some((address) => {
        const match = address.match(/^R(-{0,1}\d+)C(-{0,1}\d+)$/)
        if (!match) return false

        const [row, col] = [match[1], match[2]].map((n) => parseInt(n, 10))
        if (row <= 0 || row > this.size) return true
        if (col <= 0 || col > this.size) return true

        return false
      })
    })
    if (hasOuterText) return true

    return false
  }
}

type CellConstructor = {
  digit: number|null
  region: number
  coordinates: {
    row: number
    col: number
  }
}

type CellNeighbors = {
  left?: Cell
  right?: Cell
  up?: Cell
  down?: Cell
}

class Cell {
  digit: number|null
  centerMarks: Array<number> = []
  cornerMarks: Array<number> = []
  cellColors: Array<string> = []
  region: number
  address: string
  coordinates: { row: number; col: number }
  neighbors: CellNeighbors = {}

  given = false
  selected = false

  constructor({ digit, region, coordinates }: CellConstructor) {
    this.digit = digit
    this.region = region
    this.coordinates = coordinates
    this.address = `R${coordinates.row + 1}C${coordinates.col + 1}`
  }
}

export {
  Cell,
  Puzzle,
}

export type {
  CellConstructor,
  CellNeighbors,
}
