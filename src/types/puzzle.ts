import { unzip } from '@/utils/puzzleZipper'
import type {
  FPuzzle,
} from './f-puzzle'
import type {
  Arrow,
  KillerCage,
  Quadruple,
  Thermometer,
  BetweenLine,
  MinMaxCell,
  LittleKiller,
  SandwichSum,
} from './constraints'
import type {
  Text,
  Line,
  Circle,
  Rectangle,
  CellBackgroundColor,
} from './cosmetics'
import { addressToCoordinates } from '@/utils/grid-helpers'

export default class Puzzle {
  size: number
  cells: Array<Array<Cell>>
  selectedAddresses: Array<string> = []

  cellBackgroundColors?: Array<CellBackgroundColor>
  solution?: Array<number|null>
  successMessage?: string
  title?: string
  author?: string
  rules?: string
  cages?: Array<KillerCage>
  littleKillers?: Array<LittleKiller>
  sandwichSums?: Array<SandwichSum>
  extraRegions?: Array<KillerCage>
  text?: Array<Text>
  lines?: Array<Line>
  circles?: Array<Circle>
  quadruples?: Array<Quadruple>
  clones?: Array<Rectangle>
  rectangles?: Array<Rectangle>
  thermometers?: Array<Thermometer>
  arrows?: Array<Arrow>
  betweenLines?: Array<BetweenLine>
  maxCells?: Array<MinMaxCell>
  minCells?: Array<MinMaxCell>

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
            row: i + 1,
            col: j + 1,
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
      return Puzzle.fromFPuzzle(json)
    }

    return new Puzzle(9)
  }

  static fromFPuzzle(fPuzzle: FPuzzle) {
    console.log(fPuzzle)
    const puzzle = new Puzzle(fPuzzle.size)

    puzzle.title = fPuzzle.title
    puzzle.author = fPuzzle.author
    puzzle.rules = fPuzzle.ruleset
    puzzle.solution = fPuzzle.solution
    puzzle.quadruples = fPuzzle.quadruple
    puzzle.littleKillers = fPuzzle.littlekillersum
    puzzle.sandwichSums = fPuzzle.sandwichsum
    puzzle.cellBackgroundColors = []

    fPuzzle.grid.forEach((row, i) => {
      row.forEach((cell, j) => {
        const puzzCell = puzzle.cells[i][j]
        if (cell.region !== undefined) puzzCell.region = cell.region
        if (cell.value !== undefined) puzzCell.digit = cell.value
        if (cell.given !== undefined) puzzCell.given = cell.given
        if (cell.c) {
          puzzle.cellBackgroundColors!.push({
            address: puzzCell.address,
            color: cell.c,
          })
        }
      })
    })

    puzzle.arrows = fPuzzle.arrow

    puzzle.thermometers = fPuzzle.thermometer?.reduce(
      (list, thermo) => {
        thermo.lines.forEach((line) => {
          if (line.length) {
            const bulb = line[0]
            const existing = list.find((check) => check.bulb === bulb)
            if (existing) {
              existing.lines.push(line)
            } else {
              list.push({ bulb, lines: [line] })
            }
          }
        })

        return list
      },
      [] as Array<Thermometer>,
    )

    puzzle.text = [
      ...fPuzzle.text || [],
      ...fPuzzle.xv?.map(({ cells, value }) => ({
        cells,
        value,
        fontC: '#000000',
        size: 0.3,
      })) || []
    ]
    if (!puzzle.text.length) delete puzzle.text

    puzzle.extraRegions = fPuzzle.extraregion?.map((region) => ({
      ...region,
      cosmetic: false,
    }))

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
    ]
    if (!puzzle.cages.length) delete puzzle.cages

    puzzle.lines = [
      ...fPuzzle.line?.map((line) => ({
        lines: line.lines,
        width: line.width,
        color: line.outlineC,
      })) || [],
      ...fPuzzle.palindrome?.map((line) => ({
        lines: line.lines,
        width: 0.5,
        color: '#CFCFCF',
      })) || [],
    ]
    if (!puzzle.lines.length) delete puzzle.lines

    puzzle.circles = [
      ...fPuzzle.circle?.map((circle) => ({
        cells: circle.cells,
        fill: circle.baseC,
        outline: circle.outlineC,
        fontColor: circle.fontC,
        height: circle.height,
        width: circle.width,
      })) || [],
      ...fPuzzle.difference?.map((diff) => ({
        cells: diff.cells,
        fill: '#ffffff',
        outline: '#000000',
        fontColor: '#000000',
        height: 0.25,
        width: 0.25,
      })) || [],
      ...fPuzzle.ratio?.map((ratio) => ({
        cells: ratio.cells,
        fill: '#000000',
        outline: '#000000',
        fontColor: '#ffffff',
        height: 0.25,
        width: 0.25,
      })) || [],
      ...fPuzzle.odd?.map(({ cell }) => ({
        cells: [cell],
        fill: '#bbbbbb',
        outline: '#bbbbbb',
        fontColor: '#bbbbbb',
        height: 0.7,
        width: 0.7,
      })) || [],
    ]
    if (!puzzle.circles.length) delete puzzle.circles

    puzzle.clones = fPuzzle.clone?.flatMap(({ cells, cloneCells }) => [
      ...[cells, cloneCells].map((rectCells) => ({
        cells: rectCells,
        height: 1,
        width: 1,
        fill: '#cccccc',
        outline: '#cccccc',
        fontColor: '#cccccc',
      })),
    ])

    puzzle.rectangles = [
      ...fPuzzle.rectangle?.map((rect) => ({
        width: rect.width,
        height: rect.height,
        cells: rect.cells,
        fill: rect.baseC,
        outline: rect.outlineC,
        fontColor: rect.fontC,
        angle: rect.angle,
      })) || [],
      ...fPuzzle.even?.map(({ cell }) => ({
        cells: [cell],
        width: 0.65,
        height: 0.65,
        fill: '#bbbbbb',
        outline: '#bbbbbb',
        fontColor: '#bbbbbb',
      })) || [],
    ]
    if (!puzzle.rectangles.length) delete puzzle.rectangles

    puzzle.betweenLines = fPuzzle.betweenline?.reduce(
      (list, { lines }) => {
        lines.forEach((line) => {
          const lineBulbs = [
            line[0],
            line[line.length - 1],
          ]

          const existingLine = list.find(
            ({ bulbs }) => bulbs.some(
              (address) => lineBulbs.includes(address),
            ),
          )

          if (existingLine) {
            lineBulbs.forEach((address) => {
              if (!existingLine.bulbs.includes(address)) {
                existingLine.bulbs.push(address)
              }
            })

            existingLine.lines.push(line)
          } else {
            list.push({
              bulbs: lineBulbs,
              lines: [line],
            })
          }
        })

        return list
      },
      [] as Array<BetweenLine>,
    )

    puzzle.minCells = fPuzzle.minimum?.reduce(
      (list, { cell }) => {
        const { row, col } = addressToCoordinates(cell)
        const minMax = {
          row,
          col,
          top: row !== 1,
          left: col !== 1,
          right: col !== puzzle.size,
          bottom: row !== puzzle.size,
        }

        list.forEach((check) => {
          if (check.col === minMax.col) {
            if (check.row === minMax.row - 1) {
              check.right = false
              minMax.left = false
            } else if (check.row === minMax.row + 1) {
              check.left = false
              minMax.right = false
            }
          } else if (check.row === minMax.row) {
            if (check.col === minMax.col - 1) {
              check.bottom = false
              minMax.top = false
            } else if (check.col === minMax.col + 1) {
              check.top = false
              minMax.bottom = false
            }
          }
        })

        return [
          ...list,
          minMax,
        ]
      },
      [] as Array<MinMaxCell>,
    )

    puzzle.maxCells = fPuzzle.maximum?.reduce(
      (list, { cell }) => {
        const { row, col } = addressToCoordinates(cell)
        const minMax = {
          row,
          col,
          top: row !== 1,
          left: col !== 1,
          right: col !== puzzle.size,
          bottom: row !== puzzle.size,
        }

        list.forEach((check) => {
          if (check.col === minMax.col) {
            if (check.row === minMax.row - 1) {
              check.right = false
              minMax.left = false
            } else if (check.row === minMax.row + 1) {
              check.left = false
              minMax.right = false
            }
          } else if (check.row === minMax.row) {
            if (check.col === minMax.col - 1) {
              check.bottom = false
              minMax.top = false
            } else if (check.col === minMax.col + 1) {
              check.top = false
              minMax.bottom = false
            }
          }
        })

        return [
          ...list,
          minMax,
        ]
      },
      [] as Array<MinMaxCell>,
    )

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
    if (row > this.size || col > this.size) throw new Error('Out of bounds')
    if (row <= 0 || col <= 0) throw new Error('Out of bounds')

    return this.cells[row - 1][col - 1]
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

  get allAddresses(): Array<string> {
    return [
      ...this.text?.flatMap(({ cells }) => cells) || [],
      ...this.rectangles?.flatMap(({ cells }) => cells) || [],
      ...this.circles?.flatMap(({ cells }) => cells) || [],
      ...this.littleKillers?.map(({ cell }) => cell) || [],
      ...this.sandwichSums?.map(({ cell }) => cell) || [],
    ].flat()
  }

  get allCoordinates(): Array<{ row: number, col: number }> {
    return this.allAddresses.map((address) => addressToCoordinates(address))
  }

  get dimensions() {
    return this.allCoordinates.reduce(
      (dimensions, coords) => ({
        minRow: Math.min(dimensions.minRow, coords.row),
        minCol: Math.min(dimensions.minCol, coords.col),
        maxRow: Math.max(dimensions.maxRow, coords.row),
        maxCol: Math.max(dimensions.maxCol, coords.col),
      }),
      {
        minRow: 1,
        minCol: 1,
        maxRow: this.size,
        maxCol: this.size,
      },
    )
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
    this.address = `R${coordinates.row}C${coordinates.col}`
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
