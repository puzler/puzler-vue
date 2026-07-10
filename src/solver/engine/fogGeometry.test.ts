import { describe, it, expect } from 'vitest'
import { computeFoggedIndices } from './fogGeometry'
import { computeFoggedCells } from '@/utils/fog'

// Deterministic PRNG so the parity sweep is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const key = (size: number, cell: number) => `r${Math.floor(cell / size)}c${cell % size}`

describe('computeFoggedIndices', () => {
  it('matches the string-key implementation across random fog states', () => {
    const rand = mulberry32(0x5eed)
    for (const size of [4, 6, 9]) {
      for (let round = 0; round < 25; round += 1) {
        const lights = new Set<number>()
        const verified = new Set<number>()
        for (let cell = 0; cell < size * size; cell += 1) {
          const r = rand()
          if (r < 0.08) lights.add(cell)
          else if (r < 0.16) verified.add(cell)
        }
        const expected = computeFoggedCells({
          rows: size,
          cols: size,
          lights: new Set([...lights].map((c) => key(size, c))),
          verified: new Set([...verified].map((c) => key(size, c))),
        })
        const actual = new Set([...computeFoggedIndices(size, size, lights, verified)].map((c) => key(size, c)))
        expect(actual).toEqual(expected)
      }
    }
  })

  it('fogs the whole grid with no lights or verified digits', () => {
    expect(computeFoggedIndices(9, 9, [], []).size).toBe(81)
  })

  it('clears exactly the light itself but a 3x3 block around a verified digit', () => {
    // Light at r0c0 clears one cell; verified at r4c4 clears the 3x3 around it.
    const fogged = computeFoggedIndices(9, 9, [0], [40])
    expect(fogged.has(0)).toBe(false)
    expect(fogged.has(1)).toBe(true)
    for (const cell of [30, 31, 32, 39, 40, 41, 48, 49, 50]) {
      expect(fogged.has(cell)).toBe(false)
    }
    expect(fogged.size).toBe(81 - 1 - 9)
  })
})
