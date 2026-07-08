import { describe, it, expect } from 'vitest'
import { compareCellValues, sortMarks, isLetter, LETTER_LABELS } from './cellValues'

describe('isLetter', () => {
  it('accepts single capital letters only', () => {
    expect(isLetter('A')).toBe(true)
    expect(isLetter('Z')).toBe(true)
    expect(isLetter('a')).toBe(false)
    expect(isLetter('AB')).toBe(false)
    expect(isLetter('')).toBe(false)
    expect(isLetter(5)).toBe(false)
    expect(isLetter(null)).toBe(false)
  })
})

describe('compareCellValues / sortMarks', () => {
  it('orders digits ascending before letters alphabetical', () => {
    expect(sortMarks(['B', 3, 'A', 1, 9])).toEqual([1, 3, 9, 'A', 'B'])
  })

  it('never produces the NaN-comparator scramble on mixed arrays', () => {
    // A bare (a, b) => a - b comparator returns NaN for mixed pairs, which
    // leaves elements wherever the engine's sort happens to put them.
    const sorted = sortMarks(['C', 2, 'A', 7])
    expect(sorted).toEqual([2, 7, 'A', 'C'])
  })

  it('is stable for equal values', () => {
    expect(compareCellValues(4, 4)).toBe(0)
    expect(compareCellValues('D', 'D')).toBe(0)
  })
})

describe('LETTER_LABELS', () => {
  it('maps keypad keys 1-9,0 to the first ten letters', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => LETTER_LABELS[n])).toEqual([
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    ])
  })
})
