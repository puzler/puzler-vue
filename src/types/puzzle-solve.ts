import PuzzleSolveCell from './puzzle-solve-cell'
import { Visibility } from '@/graphql/generated/types'
import type {
  Address,
  Puzzle,
  CustomLine,
  Circle,
  Rectangle,
  Text,
  CellBackgroundColor,
  Cage,
} from '@/graphql/generated/types'
import ConstraintStyles from './constraint-styles';

function dimensionsForSize(size: number): { width: number; height: number} {
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

function regionsForSize(size: number): Array<Array<number>> {
  const { height, width } = dimensionsForSize(size)
  const regionsPerRow = size / width

  return Array.from(
    { length: size },
    (_, row) => Array.from(
      { length: size },
      (_, column) => {
        const verticalRegion = Math.floor(row / height) * regionsPerRow
        const regionOfRow = Math.floor(column / width)

        return verticalRegion + regionOfRow
      }
    )
  )
}

class PuzzleSolve {
  constructor({
    puzzle,
    size = 9,
  }: { puzzle?: Puzzle, size: number }) {
    if (!puzzle) {
      this.size = size

      this.cells = regionsForSize(size).reduce(
        (cells, regionRow, row) => {
          return [
            ...cells,
            regionRow.reduce(
              (cellRow, region, column) => {
                const cell = new PuzzleSolveCell({
                  region,
                  address: { row, column },
                })

                if (row !== 0) {
                  cell.neighbors.up = cells[row - 1][column]
                  cells[row - 1][column].neighbors.down = cell
                }
                if (column !== 0) {
                  cell.neighbors.left = cellRow[column - 1]
                  cellRow[column - 1].neighbors.right = cell
                }

                return [...cellRow, cell]
              },
              [] as Array<PuzzleSolveCell>,
            )
          ]
        },
        [] as Array<Array<PuzzleSolveCell>>,
      )

      this.puzzleData = {
        size: size,
        visibility: Visibility.Unlisted,
        localConstraints: {},
        globalConstraints: {},
        cosmetics: {},
        cells: this.cells.map(
          (rowCells) => rowCells.map(
            ({ region }) => ({ region }),
          ),
        ),
      }
    } else {
      this.puzzleData = puzzle
      this.size = puzzle.size
      this.cells = puzzle.cells.reduce(
        (cells, rowCells, row) => {
          return [
            ...cells,
            rowCells.reduce(
              (cellRow, cellData, column) => {
                const cell = new PuzzleSolveCell({
                  digit: cellData.digit || undefined,
                  given: cellData.given || false,
                  region: cellData.region,
                  address: { row, column },
                })

                if (row !== 0) {
                  cell.neighbors.up = cells[row - 1][column]
                  cells[row - 1][column].neighbors.down = cell
                }
                if (column !== 0) {
                  cell.neighbors.left = cellRow[column - 1]
                  cellRow[column - 1].neighbors.right = cell
                }

                return [...cellRow, cell]
              },
              [] as Array<PuzzleSolveCell>,
            )
          ]
        },
        [] as Array<Array<PuzzleSolveCell>>,
      )
    }
  }

  size: number
  cells: Array<Array<PuzzleSolveCell>>
  puzzleData: Puzzle
  gridOuterCells = false

  deselectAll() {
    for (let row = 0; row < this.size; row += 1) {
      for (let column = 0; column < this.size; column += 1) {
        this.cells[row][column].selected = false
      }
    }
  }

  cellAt({ row, column }: Address) {
    if (row > this.size || column > this.size || row < 0 || column < 0) throw new Error('Out of bounds')

    return this.cells[row][column]
  }

  get selectedCells(): Array<PuzzleSolveCell> {
    return this.cells.reduce(
      (selected, row) => {
        return [
          ...selected,
          ...row.filter((cell) => cell.selected)
        ]
      },
      [] as Array<PuzzleSolveCell>,
    )
  }

  private searchForAddresses(obj: Record<string, any>): Array<Address> {
    const addresses = [] as Array<Address>
    if (obj.__typename === 'Address') return [obj as Address]

    Object.keys(obj).forEach((key) => {
      const prop = obj[key]
      if (prop) {
        if (Array.isArray(prop)) {
          prop.forEach((item) => {
            addresses.push(
              ...this.searchForAddresses(item)
            )
          })
        } else if (typeof prop === 'object') {
          addresses.push(
            ...this.searchForAddresses(prop)
          )
        }
      } 
    })

    return addresses
  }

  get boundingDimensions() {
    const allAddresses = this.searchForAddresses({
      ...this.puzzleData?.localConstraints,
      ...this.puzzleData?.cosmetics,
    })

    const { rows, columns } = allAddresses.reduce(
      (
        { rows, columns },
        { row, column },
      ) => {
        return {
          rows: [...rows, row],
          columns: [...columns, column],
        }
      },
      { rows: [], columns: [] } as { rows: Array<number>, columns: Array<number> },
    )

    const defaultMin = this.gridOuterCells ? -1 : 0
    const defaultMax = this.gridOuterCells ? this.size : this.size - 1

    return {
      minRow: Math.min(...rows, defaultMin),
      minColumn: Math.min(...columns, defaultMin),
      maxRow: Math.max(...rows, defaultMax),
      maxColumn: Math.max(...columns, defaultMax),
    }
  }

  get uniqueGroups() {
    const groups = [] as Array<Array<PuzzleSolveCell>>

    const rows = {} as Record<number, Array<PuzzleSolveCell>>
    const columns = {} as Record<number, Array<PuzzleSolveCell>>
    const regions = {} as Record<number, Array<PuzzleSolveCell>>

    this.cells.forEach((rowCells, row) => {
      rowCells.forEach((cell, column) => {
        (rows[row] ||= []).push(cell);
        (columns[column] ||= []).push(cell);
        (regions[cell.region] ||= []).push(cell)
      })
    })

    groups.push(
      ...Object.values(rows),
      ...Object.values(columns),
      ...Object.values(regions),
    )

    if (this.puzzleData?.globalConstraints) {
      const {
        diagonals,
        chess,
      } = this.puzzleData.globalConstraints

      if (diagonals) {
        const diagonalGroups = {
          positive: [],
          negative: [],
        } as Record<string, Array<PuzzleSolveCell>>

        for (let i = 0; i < this.size; i += 1) {
          diagonalGroups.positive.push(this.cells[this.size - 1 - i][i])
          diagonalGroups.negative.push(this.cells[i][i])
        }

        if (diagonals.positive) groups.push(diagonalGroups.positive)
        if (diagonals.negative) groups.push(diagonalGroups.negative)
      }

      if (chess) {
        groups.push(
          ...this.cells.flatMap(
            (rowCells) => rowCells.flatMap(
              (cell) => {
                const neighborChecks = [] as Array<Array<PuzzleSolveCell>>
                
                if (chess.king) {
                  neighborChecks.push(
                    ...cell.kingNeighbors.map(
                      (neighbor) => [neighbor, cell],
                    )
                  )
                }

                if (chess.knight) {
                  neighborChecks.push(
                    ...cell.knightNeighbors.map(
                      (neighbor) => [cell, neighbor],
                    )
                  )
                }

                return neighborChecks
              }
            )
          )
        )
      }
    }

    if (this.puzzleData?.localConstraints) {
      const {
        extraRegions,
        killerCages,
      } = this.puzzleData.localConstraints

      if (extraRegions) {
        groups.push(
          ...extraRegions.map(
            ({ cells }) => cells.map(
              ({ row, column }) => this.cells[row][column],
            ),
          )
        )
      }

      if (killerCages) {
        groups.push(
          ...killerCages.map(
            ({ cells }) => cells.map(
              ({ row, column }) => this.cells[row][column],
            )
          )
        )
      }
    }

    return groups
  }

  get errorAddresses() {
    return this.uniqueGroups.reduce(
      (addresses, group) => {
        const counts = {} as Record<number, number>
        group.forEach(
          ({ digit }) => {
            if (digit !== null) {
              counts[digit] ||= 0
              counts[digit] += 1
            }
          }
        )

        return [
          ...addresses,
          ...group.reduce(
            (list, { digit, address }) => {
              if (digit === null) return list
              if (addresses.some(({ row, column }) => row === address.row && column === address.column)) return list
              if (counts[digit] === 1) return list

              return [
                ...list,
                address
              ]
            },
            [] as Array<Address>
          )
        ]
      },
      [] as Array<Address>
    )
  }

  get digits(): Array<number|null> {
    return this.cells.flatMap((row) => row.map(({ digit }) => digit))
  }

  checkSolution(): boolean {
    if (this.puzzleData?.solution) {
      return this.digits === this.puzzleData?.solution
    }

    return this.uniqueGroups.every(
      (group) => group.every(
        ({ digit }, i) => {
          if (digit === null) return false 

          return group.findIndex(
            (check) => check.digit === digit,
          ) === i
        }
      )
    )
  }

  get author() {
    return this.puzzleData.author || this.puzzleData.user?.displayName
  }

  get visualLines(): Array<CustomLine> {
    return [
      ...this.puzzleData.cosmetics.lines || [],
      ...this.puzzleData.localConstraints.palindromeLines?.map(
        (line) => ({
          ...line,
          ...ConstraintStyles.lines.palindrome,
        } as CustomLine)
      ) || [],
      ...this.puzzleData.localConstraints.renbanLines?.map(
        (line) => ({
          ...line,
          ...ConstraintStyles.lines.renban,
        } as CustomLine)
      ) || [],
      ...this.puzzleData.localConstraints.germanWhisperLines?.map(
        (line) => ({
          ...line,
          ...ConstraintStyles.lines.germanWhisper,
        } as CustomLine)
      ) || [],
      ...this.puzzleData.localConstraints.dutchWhisperLines?.map(
        (line) => ({
          ...line,
          ...ConstraintStyles.lines.dutchWhisper,
        } as CustomLine)
      ) || [],
      ...this.puzzleData.localConstraints.regionSumLines?.map(
        (line) => ({
          ...line,
          ...ConstraintStyles.lines.regionSum,
        } as CustomLine)
      ) || [],
    ]
  }

  get visualCircles(): Array<Circle> {
    const styles = ConstraintStyles.shapes
    return [
      ...this.puzzleData.cosmetics.circles || [],
      ...this.puzzleData.localConstraints.oddCells?.map(
        ({ cell }) => ({ address: cell, ...styles.oddCell }),
      ) || [],
      ...this.puzzleData.localConstraints.differenceDots?.map(
        ({ location, difference }) => {
          return {
            address: location,
            text: difference,
            ...styles.difference,
          }
        }
      ) || [],
      ...this.puzzleData.localConstraints.ratioDots?.map(
        ({ location, ratio }) => ({
          address: location,
          text: ratio,
          ...styles.ratio,
        }),
      ) || [],
    ]
  }

  get visualRectangles(): Array<Rectangle> {
    const styles = ConstraintStyles.shapes
    return [
      ...this.puzzleData.cosmetics.rectangles || [],
      ...this.puzzleData.localConstraints.evenCells?.map(
        ({ cell }) => ({ address: cell, ...styles.evenCell }),
      ) || []
    ]
  }

  get visualText(): Array<Text> {
    const styles = ConstraintStyles.texts
    return [
      ...this.puzzleData.cosmetics.text || [],
      ...this.puzzleData.localConstraints.xv?.map(
        ({ location, xvType }) => ({
          address: location,
          text: xvType || ' ',
          ...styles.xv,
        }),
      ) || [],
      ...this.puzzleData.localConstraints.sandwichSums?.map(
        ({ location, value }) => ({
          address: location,
          text: value?.toString() || '_',
          ...styles.sandwichSum,
        })
      ) || [],
      ...this.puzzleData.localConstraints.xSums?.map(
        ({ location, value }) => ({
          address: location,
          text: value?.toString() || '_',
          ...styles.xSum,
        }),
      ) || [],
      ...this.puzzleData.localConstraints.skyscrapers?.map(
        ({ location, value }) => ({
          address: location,
          text: value?.toString() || '_',
          ...styles.skyscraper,
        }),
      ) || [],
    ]
  }

  get visualCellBackgrounds(): Array<CellBackgroundColor> {
    const styles = ConstraintStyles.cellBackgrounds
    return [
      ...this.puzzleData.cosmetics.cellBackgroundColors || [],
      ...this.puzzleData.localConstraints.extraRegions?.flatMap(
        (region) => {
          return region.cells.map(
            (cell) => ({
              cell,
              color: styles.extraRegion,
            }),
          )
        },
      ) || [],
      ...this.puzzleData.localConstraints.clones?.flatMap(
        ({ cells, cloneCells }) => [
          ...cells.map((cell) => ({ cell, color: styles.clone })),
          ...cloneCells.flatMap(
            (cells) => cells.map(
              (cell) => ({ cell, color: styles.clone })
            )
          )
        ]
      ) || [],
      ...this.puzzleData.localConstraints.rowIndexCells?.map(
        ({ cell }) => ({ cell, color: styles.rowIndexing }),
      ) || [],
      ...this.puzzleData.localConstraints.columnIndexCells?.map(
        ({ cell }) => ({ cell, color: styles.columnIndexing }),
      ) || [],
    ]
  }

  get visualCages(): Array<Cage> {
    const cageStyle = ConstraintStyles.cage
    return [
      ...this.puzzleData.cosmetics.cages || [],
      ...this.puzzleData.localConstraints.killerCages?.map(
        ({ cells, value }) => ({
          cells,
          text: value?.toString(),
          ...cageStyle,
        }),
      ) || [],
      ...this.puzzleData.localConstraints.extraRegions?.map(
        ({ cells }) => ({
          cells,
          ...cageStyle,
        }),
      ) || [],
    ]
  }
}

export default PuzzleSolve
