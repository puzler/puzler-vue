import { sha256 } from 'js-sha256'
import { cellKey, keyToRowCol } from '@/composables/useGrid'

// Fog of War helpers. Fog is fully derived state: a cell is fogged unless it
// is a light, or it sits in the 3x3 neighborhood of a verified digit. Nothing
// here persists — undo, deletion and session restore all re-derive the fog.

// Per-cell verification hash for published play: the client hashes a placed
// digit and compares against the server's value, so the raw solution never
// reaches the frontend. MUST match FogCellHasher in
// api/app/services/fog_cell_hasher.rb exactly: SHA256("salt:cellKey:digit")
// with internal 0-indexed cell keys (r0c0 = top-left) and the published
// version's solutionHash as the salt.
export function fogCellHash(salt: string, cellKey: string, digit: number): string {
  return sha256(`${salt}:${cellKey}:${digit}`)
}

export interface FogInput {
  rows: number
  cols: number
  // Light cells shine through the fog from the start (just the cell itself).
  lights: ReadonlySet<string>
  // Cells holding a verified digit; each clears itself and all 8 neighbors.
  verified: ReadonlySet<string>
}

// The set of currently fogged cells (internal 0-indexed keys).
export function computeFoggedCells({ rows, cols, lights, verified }: FogInput): Set<string> {
  const cleared = new Set<string>(lights)
  for (const key of verified) {
    const { row, col } = keyToRowCol(key)
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
        cleared.add(cellKey(r, c))
      }
    }
  }
  const fogged = new Set<string>()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = cellKey(r, c)
      if (!cleared.has(key)) fogged.add(key)
    }
  }
  return fogged
}
