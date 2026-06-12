import { describe, it, expect } from 'vitest'
import { outerKey, parseOuterKey, validLittleKillerDirections } from './constraints'

describe('outerKey / parseOuterKey', () => {
  it('round-trips positive and negative coordinates', () => {
    for (const pos of [{ row: -1, col: 3 }, { row: 9, col: -1 }, { row: -1, col: -1 }, { row: 9, col: 9 }]) {
      expect(parseOuterKey(outerKey(pos.row, pos.col))).toEqual(pos)
    }
  })

  it('rejects cell keys and malformed input', () => {
    expect(parseOuterKey('r1c2')).toBeNull()
    expect(parseOuterKey('o:r1')).toBeNull()
    expect(parseOuterKey('')).toBeNull()
  })
})

describe('validLittleKillerDirections (9x9 grid)', () => {
  const dirs = (row: number, col: number) => validLittleKillerDirections(row, col, 9, 9)

  it('corners get exactly one direction, pointing into the grid', () => {
    expect(dirs(-1, -1)).toEqual(['down-right'])
    expect(dirs(-1, 9)).toEqual(['down-left'])
    expect(dirs(9, -1)).toEqual(['up-right'])
    expect(dirs(9, 9)).toEqual(['up-left'])
  })

  it('top edge cells get the two downward diagonals', () => {
    expect(dirs(-1, 4).sort()).toEqual(['down-left', 'down-right'])
  })

  it('left edge cells get the two rightward diagonals', () => {
    expect(dirs(4, -1).sort()).toEqual(['down-right', 'up-right'])
  })

  it('edge cells adjacent to a corner lose the out-of-bounds diagonal', () => {
    // Top edge above col 0: down-left would land at r0c-1 (out of bounds)
    expect(dirs(-1, 0)).toEqual(['down-right'])
  })
})
