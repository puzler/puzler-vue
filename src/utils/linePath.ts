import { keyToRowCol, CELL_SIZE, PADDING } from '@/composables/useGrid'

export function cellCenter(key: string): { x: number; y: number } {
  const { row, col } = keyToRowCol(key)
  return {
    x: PADDING + col * CELL_SIZE + CELL_SIZE / 2,
    y: PADDING + row * CELL_SIZE + CELL_SIZE / 2,
  }
}

export function cellsToPath(cells: string[]): string {
  if (cells.length < 2) return ''
  const points = cells.map(cellCenter)
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}
