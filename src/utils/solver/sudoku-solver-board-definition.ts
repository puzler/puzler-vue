import type {
  DifferenceDot,
  Address,
  RatioDot,
  Xv,
  RegionSumLine,
  LittleKillerSum,
  PalindromeLine,
  Clone,
  GermanWhisperLine,
  BetweenLine,
  RenbanLine,
  Quadruple,
  XSum,
  SandwichSum,
  RowIndexCell,
  ColumnIndexCell,
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
    },
    germanwhispers: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.germanWhisperLines,
      lines: (instance: GermanWhisperLine) => [instance.points],
    },
    dutchwhispers: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.dutchWhisperLines,
      lines: (instance: GermanWhisperLine) => [instance.points],
    },
    betweenline: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.betweenLines,
      lines: (instance: BetweenLine) => [instance.points],
    },
    renban: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.renbanLines,
      lines: (instance: RenbanLine) => [instance.points],
    },
    thermometer: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.thermometers,
    },
    quadruple: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.quadruples,
      cells: (instance: Quadruple) => {
        const rows: Set<number> = new Set()
        const columns: Set<number> = new Set()
        instance.cells.forEach(({ row, column }) => {
          rows.add(row)
          columns.add(column)
        })

        const cells: Address[] = []
        rows.forEach((row) => {
          columns.forEach((column) => {
            cells.push({ row, column })
          })
        })

        return cells
      },
    },
    xsum: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.xSums,
      cells: (instance: XSum, size: number) => {
        const { row, column } = instance.location
        if (row < 0) {
          return Array.from(
            { length: size },
            (_, i) => ({
              row: i,
              column,
            }),
          )
        }

        if (column < 0) {
          return Array.from(
            { length: size },
            (_, i) => ({
              row,
              column: i,
            })
          )
        }

        if (row >= size) {
          return Array.from(
            { length: size },
            (_, i) => ({
              row: size - i - 1,
              column,
            }),
          )
        }

        return Array.from(
          { length: size },
          (_, i) => ({
            row,
            column: size - i - 1,
          }),
        )
      },
    },
    sandwichsum: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.sandwichSums,
      cells: (instance: SandwichSum, size: number) => {
        const { row, column } = instance.location
        const isRow = column < 0 || column >= size
        const isColumn = row < 0 || row >= size
        if (isColumn && isRow) return []

        if (isRow) {
          return Array.from(
            { length: size },
            (_, i) => ({ row, column: i }),
          )
        }

        if (isColumn) {
          return Array.from(
            { length: size },
            (_, i) => ({ column, row: i }),
          )
        }

        return []
      },
    },
    rowindexcell: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.rowIndexCells,
      cells: (instance: RowIndexCell, size: number) => Array.from(
        { length: size },
        (_, i) => ({ row: instance.cell.row, column: i }),
      ),
      value: (instance: RowIndexCell) => instance.cell.column + 1
    },
    columnindexcell: {
      collector: (puzzle: PuzzleSolve) => puzzle.puzzleData.localConstraints.columnIndexCells,
      cells: (instance: ColumnIndexCell, size: number) => Array.from(
        { length: size },
        (_, i) => ({ row: i, column: instance.cell.column }),
      ),
      value: (instance: ColumnIndexCell) => instance.cell.row + 1
    },
  },
  indexForAddress: ({ row, column }: Address, size: number) => row * size + column
}

export default PuzlerBoardDefinition
