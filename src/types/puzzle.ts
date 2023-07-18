import { unzip } from '../utils/puzzleZipper'

export default class Puzzle {
  size: number
  cells: Array<Array<Cell>>
  selectedAddresses: Array<string> = []

  constructor(size: number) {
    if (size < 1) throw 'Size must be positive'

    this.size = size
    this.cells = []

    const { height, width } = this.dimensionsForSize(size)
    const regionsPerRow = size / width;

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
      const json = JSON.parse(unzipped) as FPuzz
      const puzzle = new Puzzle(json.size)
      json.grid.forEach((row, i) => {
        row.forEach((cell, j) => {
          const puzzCell = puzzle.cells[i][j]
          if (cell.region) puzzCell.region = cell.region
          if (cell.value) puzzCell.digit = cell.value
          if (cell.given !== undefined) puzzCell.given = cell.given
        })
      })

      return puzzle
    }

    return new Puzzle(9)
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
}

interface FPuzz {
  size: number;
  grid: Array<Array<FPuzzCell>>;
}

interface FPuzzCell {
  value?: number;
  region?: number;
  given?: boolean;
}

interface CellConstructor {
  digit: number|null;
  region: number;
  coordinates: {
    row: number;
    col: number;
  };
}

class Cell {
  digit: number|null
  centerMarks: Array<number> = []
  region: number
  address: string
  coordinates: { row: number; col: number }
  neighbors: {
    left?: Cell;
    right?: Cell;
    up?: Cell;
    down?: Cell;
  } = {}

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
  Puzzle
}
