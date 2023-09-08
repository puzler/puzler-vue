import type {
  DifferenceDot,
  Address,
  RatioDot,
  Xv,
  RegionSumLine,
  LittleKillerSum,
  PalindromeLine,
  Clone,
} from "@/graphql/generated/types"
import type { PuzzleSolve, PuzzleSolveCell } from "@/types"
import type { BoardDefinition } from "@puzler/sudokusolver-webworker"

const PuzlerBoardDefinition: BoardDefinition = {
  grid: {
    cells: (boardData: PuzzleSolve) => {
      return boardData.cells
    },
    value: ({ cell }: { cell: PuzzleSolveCell }) => cell.digit,
    centerPencilMarks: ({ cell }: { cell: PuzzleSolveCell }) => cell.centerMarks,
  },
  constraints: {
    antiking: (boardData: PuzzleSolve) => boardData.puzzleData.globalConstraints.chess?.king,
    antiknight: (boardData: PuzzleSolve) => boardData.puzzleData.globalConstraints.chess?.knight,
    'diagonal+': (boardData: PuzzleSolve) => boardData.puzzleData.globalConstraints.diagonals?.positive,
    'diagonal-': (boardData: PuzzleSolve) => boardData.puzzleData.globalConstraints.diagonals?.negative,
    disjointgroups: (boardData: PuzzleSolve) => boardData.puzzleData.globalConstraints.disjointSets?.enabled,
    extraregion: {
      collector: (boardData: PuzzleSolve) => boardData.puzzleData.localConstraints.extraRegions,
    },
    arrow: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.arrows
      },
    },
    difference: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.differenceDots
      },
      value: (dot: DifferenceDot) => {
        return dot.difference
      },
      negative: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.globalConstraints.antiKropki?.antiWhite || false
      },
    },
    ratio: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.ratioDots
      },
      value: (dot: RatioDot) => {
        return dot.ratio
      },
      negative: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.globalConstraints.antiKropki?.antiBlack || false
      },
    },
    xv: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.xv
      },
      value: (xv: Xv) => xv.xvType,
      negative: (boardData: PuzzleSolve) => {
        const { antiXV } = boardData.puzzleData.globalConstraints

        return {
          x: antiXV?.antiX || false,
          v: antiXV?.antiV || false,
        }
      },
    },
    killercage: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.killerCages
      },
    },
    regionsumline: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.regionSumLines
      },
      lines: (instance: RegionSumLine) => [instance.points],
    },
    palindrome: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.palindromeLines
      },
      lines: (instance: PalindromeLine) => [instance.points],
    },
    clone: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.clones
      },
      cloneGroups: (instance: Clone) => {
        return [
          instance.cells,
          ...instance.cloneCells,
        ]
      }
    },
    even: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.evenCells
      },
    },
    odd: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.oddCells
      }
    },
    maximum: {
      collector: (boardData: PuzzleSolve) => boardData.puzzleData.localConstraints.maxCells,
    },
    minimum: {
      collector: (boardData: PuzzleSolve) => boardData.puzzleData.localConstraints.minCells,
    },
    littlekillersum: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.littleKillerSums,
      clueCellName: ({ location }: LittleKillerSum) => `R${location.row + 1}C${location.column + 1}`,
      cells: (littleKiller: LittleKillerSum, size: number) => {
        const cells = [] as Array<Address>
        const current = { ...littleKiller.location }
        const next = () => {
          current.row += littleKiller.direction.top ? -1 : 1
          current.column += littleKiller.direction.left ? -1 : 1

          return current
        }
        const isInGrid = ({ row, column }: Address) => {
          if (row < 0) return false
          if (column < 0) return false
          if (row >= size) return false
          if (column >= size) return false

          return true
        }

        while (next() && isInGrid(current)) {
          if (cells.length > 100) break
          cells.push({ ...current })
        }

        return cells
      }
    }
  },
  indexForAddress: ({ row, column }: Address, size: number) => row * size + column
}

export default PuzlerBoardDefinition
