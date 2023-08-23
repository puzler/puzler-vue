import type { Address } from "@/graphql/generated/types"

type CellConstructor = {
  digit?: number
  given?: boolean
  region: number
  address: Address
}

type CellNeighbors = {
  left?: PuzzleSolveCell
  right?: PuzzleSolveCell
  up?: PuzzleSolveCell
  down?: PuzzleSolveCell
}

class PuzzleSolveCell {
  constructor(args: CellConstructor) {
    this.region = args.region
    this.address = args.address
    this.digit = args.digit || null
    this.given = args.given || false
  }

  digit: number|null
  region: number
  address: Address
  given: boolean

  centerMarks: Array<number> = []
  cornerMarks: Array<number> = []
  cellColors: Array<string> = []
  selected = false

  neighbors: CellNeighbors = {}

  get kingNeighbors(): Array<PuzzleSolveCell> {
    return [
      this.neighbors.up?.neighbors?.left,
      this.neighbors.up?.neighbors?.right,
      this.neighbors.down?.neighbors?.left,
      this.neighbors.down?.neighbors?.right,
    ].reduce(
      (list, check) => {
        if (check === undefined) return list
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
        if (check === undefined) return list
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