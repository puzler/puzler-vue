import { describe, it, expect } from 'vitest'
import { hashSolution } from './solutionHash'

describe('hashSolution', () => {
  it('produces a deterministic SHA-256 hex string', () => {
    const result = hashSolution({ 'r0c0': 5, 'r0c1': 3 })
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is order-independent — key insertion order does not affect the hash', () => {
    const a = hashSolution({ 'r0c0': 5, 'r0c1': 3 })
    const b = hashSolution({ 'r0c1': 3, 'r0c0': 5 })
    expect(a).toBe(b)
  })

  it('returns a different hash for different grids', () => {
    const a = hashSolution({ 'r0c0': 5 })
    const b = hashSolution({ 'r0c0': 6 })
    expect(a).not.toBe(b)
  })

  it('matches the known hash produced by the Ruby SolutionHasher for the same input', () => {
    // Canonical string: "r0c0:5,r0c1:3" — verified with `echo -n "r0c0:5,r0c1:3" | shasum -a 256`
    // and confirmed against api/app/services/solution_hasher.rb
    const expected = '08a683d255b76b844158a211d810e180727c5fdb93f7a6328aab6ff28e82e931'
    expect(hashSolution({ 'r0c0': 5, 'r0c1': 3 })).toBe(expected)
  })

  it('handles a single-cell grid', () => {
    const result = hashSolution({ 'r4c4': 9 })
    expect(result).toHaveLength(64)
  })
})
