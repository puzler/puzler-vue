import type { BoxRegion } from '@/types/grid'

export const CELL_SIZE = 64
export const PADDING = 10
// Gutter added outside the grid (top + left) for optional row/column labels.
export const LABEL_GUTTER = 36
export const THIN_STROKE = 0.5
export const BOX_STROKE = 2.5
export const OUTER_STROKE = 3

export function cellKey(row: number, col: number): string {
  return `r${row}c${col}`
}

export function keyToRowCol(key: string): { row: number; col: number } {
  const m = key.match(/^r(\d+)c(\d+)$/)
  if (!m) throw new Error(`Invalid cell key: ${key}`)
  return { row: Number(m[1]), col: Number(m[2]) }
}

export function cellRect(row: number, col: number) {
  return {
    x: PADDING + col * CELL_SIZE,
    y: PADDING + row * CELL_SIZE,
    width: CELL_SIZE,
    height: CELL_SIZE,
  }
}

export function svgWidth(cols: number): number {
  return PADDING * 2 + cols * CELL_SIZE
}

export function svgHeight(rows: number): number {
  return PADDING * 2 + rows * CELL_SIZE
}

function standardBoxDimensions(n: number): { boxRows: number; boxCols: number } | null {
  const known: Record<number, { boxRows: number; boxCols: number }> = {
    4: { boxRows: 2, boxCols: 2 },
    6: { boxRows: 2, boxCols: 3 },
    9: { boxRows: 3, boxCols: 3 },
    16: { boxRows: 4, boxCols: 4 },
  }
  if (known[n]) return known[n]
  const sqrt = Math.sqrt(n)
  if (Number.isInteger(sqrt)) return { boxRows: sqrt, boxCols: sqrt }
  return null
}

export function computeStandardBoxes(rows: number, cols: number): BoxRegion[] | null {
  if (rows !== cols) return null
  const dims = standardBoxDimensions(rows)
  if (!dims) return null
  const { boxRows, boxCols } = dims
  const numBoxRows = rows / boxRows
  const numBoxCols = cols / boxCols
  const boxes: BoxRegion[] = []
  for (let br = 0; br < numBoxRows; br++) {
    for (let bc = 0; bc < numBoxCols; bc++) {
      const cells: string[] = []
      for (let r = br * boxRows; r < (br + 1) * boxRows; r++) {
        for (let c = bc * boxCols; c < (bc + 1) * boxCols; c++) {
          cells.push(cellKey(r, c))
        }
      }
      boxes.push({ cells })
    }
  }
  return boxes
}

export function pointerToSvgPoint(
  event: PointerEvent,
  svgEl: SVGSVGElement,
): { x: number; y: number } | null {
  const pt = svgEl.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const ctm = svgEl.getScreenCTM()
  if (!ctm) return null
  const svgPt = pt.matrixTransform(ctm.inverse())
  return { x: svgPt.x, y: svgPt.y }
}

export function pointerToCell(
  event: PointerEvent,
  svgEl: SVGSVGElement,
  rows: number,
  cols: number,
): { row: number; col: number } | null {
  const svgPt = pointerToSvgPoint(event, svgEl)
  if (!svgPt) return null
  const col = Math.floor((svgPt.x - PADDING) / CELL_SIZE)
  const row = Math.floor((svgPt.y - PADDING) / CELL_SIZE)
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null
  return { row, col }
}
