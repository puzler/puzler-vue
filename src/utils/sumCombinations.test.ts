import { describe, it, expect } from 'vitest'
import { enumerateCombos, comboKey, comboStats, type Combo } from './sumCombinations'

const keys = (r: { combos: Combo[] }) => r.combos.map((c) => c.key)
const digitsOf = (r: { combos: Combo[] }) => r.combos.map((c) => c.digits.join(''))

describe('comboKey', () => {
  it('joins digits with commas', () => {
    expect(comboKey([1, 2, 9])).toBe('1,2,9')
  })
})

describe('enumerateCombos', () => {
  it('lists canonical killer combos for size + total', () => {
    expect(digitsOf(enumerateCombos(9, { size: 2, total: 5 }))).toEqual(['14', '23'])
    expect(digitsOf(enumerateCombos(9, { size: 3, total: 24 }))).toEqual(['789'])
    expect(digitsOf(enumerateCombos(9, { size: 9, total: 45 }))).toEqual(['123456789'])
    expect(digitsOf(enumerateCombos(9, { size: 3, total: 12 }))).toEqual([
      '129', '138', '147', '156', '237', '246', '345',
    ])
  })

  it('returns nothing for unreachable totals', () => {
    expect(enumerateCombos(9, { size: 2, total: 18 }).combos).toEqual([])
    expect(enumerateCombos(9, { size: 2, total: 2 }).combos).toEqual([])
    expect(enumerateCombos(9, { size: 4, total: 9 }).combos).toEqual([])
  })

  it('respects include and exclude', () => {
    expect(digitsOf(enumerateCombos(9, { size: 3, total: 12, include: [9] }))).toEqual(['129'])
    expect(digitsOf(enumerateCombos(9, { size: 3, total: 12, exclude: [1, 2] }))).toEqual(['345'])
    expect(enumerateCombos(9, { size: 2, total: 5, include: [1], exclude: [1] }).combos).toEqual([])
  })

  it('handles include digits in any order and out of range', () => {
    expect(digitsOf(enumerateCombos(9, { size: 3, include: [9, 1], total: 12 }))).toEqual(['129'])
    expect(digitsOf(enumerateCombos(9, { size: 2, total: 5, include: [12] }))).toEqual(['14', '23'])
  })

  it('applies min/max windows when exact values are unset', () => {
    const r = enumerateCombos(9, { minSize: 2, maxSize: 2, minTotal: 16, maxTotal: 17 })
    expect(digitsOf(r)).toEqual(['79', '89'])
  })

  it('treats min > max as empty', () => {
    expect(enumerateCombos(9, { minSize: 3, maxSize: 2 }).combos).toEqual([])
    expect(enumerateCombos(9, { minTotal: 9, maxTotal: 5 }).combos).toEqual([])
    // Exact total wins over the min/max window entirely.
    expect(digitsOf(enumerateCombos(9, { size: 2, total: 5, minTotal: 9, maxTotal: 5 }))).toEqual(['14', '23'])
  })

  it('works on smaller digit ranges', () => {
    expect(digitsOf(enumerateCombos(6, { size: 2, total: 7 }))).toEqual(['16', '25', '34'])
    expect(enumerateCombos(6, { size: 2, total: 15 }).combos).toEqual([])
  })

  it('rejects out-of-range digitMax', () => {
    expect(enumerateCombos(0, {}).combos).toEqual([])
    expect(enumerateCombos(17, { size: 2, total: 5 }).combos).toEqual([])
  })

  it('caps output and reports truncation', () => {
    const r = enumerateCombos(9, {}, 10)
    expect(r.combos).toHaveLength(10)
    expect(r.truncated).toBe(true)
    const all = enumerateCombos(9, {})
    expect(all.truncated).toBe(false)
    expect(all.combos.length).toBe(511) // 2^9 - 1 non-empty subsets
  })

  it('enumerates combos sorted lexicographically', () => {
    const r = keys(enumerateCombos(9, { size: 2, total: 9 }))
    expect(r).toEqual(['1,8', '2,7', '3,6', '4,5'])
  })
})

describe('comboStats', () => {
  const combos = enumerateCombos(9, { size: 3, total: 12 }).combos

  it('computes count, required and missing digits', () => {
    const stats = comboStats(combos, new Set(), 9)
    expect(stats.count).toBe(7)
    expect(stats.required).toEqual([]) // no digit is in all seven combos
    expect(stats.missing).toEqual([]) // every digit appears in some combo
  })

  it('recomputes over non-struck combos only', () => {
    // Strike everything except 129 and 138: both contain 1, neither has 4-7 or 9? 138 has no 9.
    const struck = new Set(combos.filter((c) => !['1,2,9', '1,3,8'].includes(c.key)).map((c) => c.key))
    const stats = comboStats(combos, struck, 9)
    expect(stats.count).toBe(2)
    expect(stats.required).toEqual([1])
    expect(stats.missing).toEqual([4, 5, 6, 7])
  })

  it('handles an empty active set', () => {
    const struck = new Set(combos.map((c) => c.key))
    const stats = comboStats(combos, struck, 9)
    expect(stats.count).toBe(0)
    expect(stats.required).toEqual([])
    expect(stats.missing).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
