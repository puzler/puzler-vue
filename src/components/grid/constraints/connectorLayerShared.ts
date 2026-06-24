import { cellCenter } from '@/utils/linePath'
import { borderKeyCells } from '@/types/constraints'

// Selection glow ring shared by all connector layers; matches the cell selection highlight.
// A CSS var (not a hex) so it follows the grid-selection theme token and its gate. Consumers
// must bind it via `:style="{ stroke: GLOW_COLOR }"` (a CSS property), NOT a `stroke` attribute,
// because var() does not resolve in SVG presentation attributes.
export const GLOW_COLOR = 'var(--color-grid-selection)'

export function borderMidpoint(key: string): { x: number; y: number } {
  const [a, b] = borderKeyCells(key)
  const ca = cellCenter(a)
  const cb = cellCenter(b)
  return { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 }
}
