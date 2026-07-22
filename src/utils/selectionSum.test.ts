import { describe, it, expect } from 'vitest'
import { selectionSumBounds, type SumCell } from './selectionSum'

const range = (max: number) => Array.from({ length: max }, (_, i) => i + 1)
const cell = (key: string, candidates: number[]): SumCell => ({ key, candidates })
const allSee = () => true
const noneSee = () => false

describe('selectionSumBounds', () => {
  it('bounds two mutually seeing free cells to 3-17', () => {
    const bounds = selectionSumBounds([cell('a', range(9)), cell('b', range(9))], allSee)
    expect(bounds).toEqual({ min: 3, max: 17, exact: false, approx: false })
  })

  it('bounds two independent free cells to 2-18', () => {
    const bounds = selectionSumBounds([cell('a', range(9)), cell('b', range(9))], noneSee)
    expect(bounds).toEqual({ min: 2, max: 18, exact: false, approx: false })
  })

  it('clamps against center-mark candidates', () => {
    // r1c1 marked [1,2,3], r1c2 free, same row: max = 3 + 9 = 12, min = 1 + 2 = 3.
    const bounds = selectionSumBounds([cell('a', [1, 2, 3]), cell('b', range(9))], allSee)
    expect(bounds).toEqual({ min: 3, max: 12, exact: false, approx: false })
  })

  it('is exact for fully fixed cells', () => {
    const bounds = selectionSumBounds([cell('a', [4]), cell('b', [7])], allSee)
    expect(bounds).toEqual({ min: 11, max: 11, exact: true, approx: false })
  })

  it('accounts for distinctness against fixed digits', () => {
    // b sees a fixed 9, so b tops out at 8.
    const bounds = selectionSumBounds([cell('a', [9]), cell('b', range(9))], allSee)
    expect(bounds).toEqual({ min: 10, max: 17, exact: false, approx: false })
  })

  it('returns null on contradiction', () => {
    expect(selectionSumBounds([cell('a', [5]), cell('b', [5])], allSee)).toBeNull()
    expect(selectionSumBounds([cell('a', []), cell('b', range(9))], allSee)).toBeNull()
    expect(selectionSumBounds([], allSee)).toBeNull()
    // Three mutually seeing cells that only allow two values.
    expect(
      selectionSumBounds([cell('a', [1, 2]), cell('b', [1, 2]), cell('c', [1, 2])], allSee),
    ).toBeNull()
  })

  it('solves a full row of nine mutually seeing cells exactly', () => {
    const cells = range(9).map((i) => cell(`c${i}`, range(9)))
    const bounds = selectionSumBounds(cells, allSee)
    expect(bounds).toEqual({ min: 45, max: 45, exact: true, approx: false })
  })

  it('mixes seeing and non-seeing pairs', () => {
    // a and b see each other; c is independent: min 1+2+1=4, max 9+8+9=26.
    const sees = (i: number, j: number) => (i === 0 && j === 1) || (i === 1 && j === 0)
    const cells = [cell('a', range(9)), cell('b', range(9)), cell('c', range(9))]
    expect(selectionSumBounds(cells, sees)).toEqual({ min: 4, max: 26, exact: false, approx: false })
  })

  it('solves clique components with restricted candidates exactly', () => {
    // Three mutually seeing cells over {1,2} / {1,2} / {1,2,3}: the third is
    // forced to 3, so the sum is pinned at 6.
    const cells = [cell('a', [1, 2]), cell('b', [1, 2]), cell('c', [1, 2, 3])]
    expect(selectionSumBounds(cells, allSee)).toEqual({ min: 6, max: 6, exact: true, approx: false })
  })

  it('solves non-clique path components exactly', () => {
    // a-b-c path over {1,2}: b differs from both ends, the ends may repeat.
    const path = (i: number, j: number) => Math.abs(i - j) === 1
    const cells = [cell('a', [1, 2]), cell('b', [1, 2]), cell('c', [1, 2])]
    expect(selectionSumBounds(cells, path)).toEqual({ min: 4, max: 5, exact: false, approx: false })
  })

  it('falls back to naive bounds for oversized non-clique components', () => {
    const path = (i: number, j: number) => Math.abs(i - j) === 1
    const cells = range(13).map((i) => cell(`c${i}`, range(9)))
    const bounds = selectionSumBounds(cells, path)
    expect(bounds).toEqual({ min: 13, max: 117, exact: false, approx: true })
  })

  it('falls back to naive bounds when the node budget is exhausted', () => {
    const path = (i: number, j: number) => Math.abs(i - j) === 1
    const cells = range(12).map((i) => cell(`c${i}`, range(12)))
    const bounds = selectionSumBounds(cells, path, 10)
    expect(bounds?.approx).toBe(true)
    expect(bounds?.min).toBe(12)
    expect(bounds?.max).toBe(144)
  })
})
