import type { Address } from "@/graphql/generated/types"
import type PuzzleSolve from "./puzzle-solve"

type CellConstructor = {
  digit?: number
  given?: boolean
  region: number
  address: Address
  puzzle: PuzzleSolve
}

type CellNeighbors = {
  left: null|PuzzleSolveCell
  right: null|PuzzleSolveCell
  up: null|PuzzleSolveCell
  down: null|PuzzleSolveCell
}

class PuzzleSolveCell {
  constructor(args: CellConstructor) {
    this.region = args.region
    this.address = args.address
    this.digit = args.digit || null
    this.given = args.given || false
    this.puzzle = args.puzzle
  }

  digit: number|null
  region: number
  address: Address
  given: boolean
  puzzle: PuzzleSolve

  centerMarks: Array<number> = []
  cornerMarks: Array<number> = []
  cellColors: Array<string> = []
  selected = false

  get neighbors(): CellNeighbors {
    const { row, column } = this.address
    return {
      up: row === 0 ? null : this.puzzle.cells[row - 1][column],
      left: column === 0 ? null : this.puzzle.cells[row][column - 1],
      down: row === this.puzzle.size - 1 ? null : this.puzzle.cells[row + 1][column],
      right: column === this.puzzle.size - 1 ? null : this.puzzle.cells[row][column + 1],
    }
  }

  get kingNeighbors(): Array<PuzzleSolveCell> {
    return [
      this.neighbors.up?.neighbors?.left,
      this.neighbors.up?.neighbors?.right,
      this.neighbors.down?.neighbors?.left,
      this.neighbors.down?.neighbors?.right,
    ].reduce(
      (list, check) => {
        if (!check) return list
        if (check.address.row === this.address.row) return list
        if (check.address.column === this.address.column) return list
        if (check.region === this.region) return list
        return [
          ...list,
          check,
        ]
      },
      [] as Array<PuzzleSolveCell>,
    )
  }

  get knightNeighbors(): Array<PuzzleSolveCell> {
    const twoUp = this.neighbors.up?.neighbors?.up
    const twoLeft = this.neighbors.left?.neighbors?.left
    const twoRight = this.neighbors.right?.neighbors?.right
    const twoDown = this.neighbors.down?.neighbors?.down

    return [
      twoUp?.neighbors?.left,
      twoUp?.neighbors?.right,
      twoDown?.neighbors?.left,
      twoDown?.neighbors?.right,
      twoLeft?.neighbors?.up,
      twoLeft?.neighbors?.down,
      twoRight?.neighbors?.up,
      twoRight?.neighbors?.down,
    ].reduce(
      (list, check) => {
        if (!check) return list
        if (check.address.row === this.address.row) return list
        if (check.address.column === this.address.column) return list
        if (check.region === this.region) return list

        return [
          ...list,
          check,
        ]
      },
      [] as Array<PuzzleSolveCell>
    )
  }
}

export default PuzzleSolveCell