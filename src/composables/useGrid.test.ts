import { describe, it, expect } from 'vitest'
import { cellKey, keyToRowCol, cellRect, svgWidth, svgHeight, computeStandardBoxes, CELL_SIZE, PADDING } from './useGrid'

describe('cellKey', () => {
  it('formats row and col into the canonical string', () => {
    expect(cellKey(0, 0)).toBe('r0c0')
    expect(cellKey(3, 7)).toBe('r3c7')
  })
})

describe('keyToRowCol', () => {
  it('parses the canonical key back to row and col', () => {
    expect(keyToRowCol('r0c0')).toEqual({ row: 0, col: 0 })
    expect(keyToRowCol('r3c7')).toEqual({ row: 3, col: 7 })
  })

  it('throws on a malformed key', () => {
    expect(() => keyToRowCol('invalid')).toThrow('Invalid cell key')
  })

  it('round-trips through cellKey', () => {
    const key = cellKey(5, 2)
    expect(keyToRowCol(key)).toEqual({ row: 5, col: 2 })
  })
})

describe('cellRect', () => {
  it('places r0c0 at the top-left padded corner', () => {
    const rect = cellRect(0, 0)
    expect(rect).toEqual({ x: PADDING, y: PADDING, width: CELL_SIZE, height: CELL_SIZE })
  })

  it('offsets each subsequent cell by CELL_SIZE', () => {
    const r1c1 = cellRect(1, 1)
    expect(r1c1.x).toBe(PADDING + CELL_SIZE)
    expect(r1c1.y).toBe(PADDING + CELL_SIZE)
  })
})

describe('svgWidth / svgHeight', () => {
  it('accounts for padding on both sides', () => {
    expect(svgWidth(9)).toBe(PADDING * 2 + 9 * CELL_SIZE)
    expect(svgHeight(9)).toBe(PADDING * 2 + 9 * CELL_SIZE)
  })
})

describe('computeStandardBoxes', () => {
  it('returns 9 boxes of 9 cells each for a 9×9 grid', () => {
    const boxes = computeStandardBoxes(9, 9)
    expect(boxes).toHaveLength(9)
    boxes!.forEach((b) => expect(b.cells).toHaveLength(9))
  })

  it('assigns r0c0 to box 0 and r0c3 to box 1 on a 9×9 grid', () => {
    const boxes = computeStandardBoxes(9, 9)!
    expect(boxes[0].cells).toContain('r0c0')
    expect(boxes[1].cells).toContain('r0c3')
  })

  it('returns 4 boxes of 4 cells each for a 4×4 grid', () => {
    const boxes = computeStandardBoxes(4, 4)
    expect(boxes).toHaveLength(4)
    boxes!.forEach((b) => expect(b.cells).toHaveLength(4))
  })

  it('returns 6 boxes of 6 cells each for a 6×6 grid', () => {
    const boxes = computeStandardBoxes(6, 6)
    expect(boxes).toHaveLength(6)
    boxes!.forEach((b) => expect(b.cells).toHaveLength(6))
  })

  it('returns null for non-square grids', () => {
    expect(computeStandardBoxes(6, 9)).toBeNull()
  })

  it('covers every cell in the grid exactly once', () => {
    const boxes = computeStandardBoxes(9, 9)!
    const all = boxes.flatMap((b) => b.cells)
    expect(all).toHaveLength(81)
    expect(new Set(all).size).toBe(81)
  })
})
