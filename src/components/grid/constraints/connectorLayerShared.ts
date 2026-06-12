import { cellCenter } from '@/utils/linePath'
import { borderKeyCells } from '@/types/constraints'

// Selection glow ring shared by all connector layers; matches the cell
// selection highlight
export const GLOW_COLOR = '#F0A93B'

export function borderMidpoint(key: string): { x: number; y: number } {
  const [a, b] = borderKeyCells(key)
  const ca = cellCenter(a)
  const cb = cellCenter(b)
  return { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 }
}
