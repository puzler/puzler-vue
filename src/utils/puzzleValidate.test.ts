import { describe, it, expect } from 'vitest'
import { validatePuzzle } from './puzzleValidate'
import type { SerializedPuzzle } from './puzzleExport'

// The tiering under test: functionally broken = error (blocks apply), weird
// choice = allowed or warned (setter approves via the modal).

function doc(partial: Partial<SerializedPuzzle>): SerializedPuzzle {
  return { formatVersion: 4, grid: { rows: 9, cols: 9 }, ...partial }
}

function paths(issues: Array<{ path: string }>): string[] {
  return issues.map((i) => i.path)
}

describe('validatePuzzle errors (functionally broken)', () => {
  it('rejects malformed cell keys anywhere', () => {
    const { errors } = validatePuzzle(doc({
      givenDigits: { banana: 5 },
      constraints: { killerCages: [{ cells: ['r1c1', 'nope'] }] },
    }))
    expect(paths(errors)).toContain('givenDigits.banana')
    expect(paths(errors)).toContain('constraints.killerCages[0].cells[1]')
  })

  it('rejects document rows/columns below 1 on cell-bound data', () => {
    const { errors } = validatePuzzle(doc({ givenDigits: { r0c3: 5 } }))
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('start at 1')
  })

  it('allows well-formed out-of-bounds cells silently (setter choice)', () => {
    const result = validatePuzzle(doc({
      constraints: { killerCages: [{ cells: ['r99c1', 'r99c2'], sum: 10 }] },
    }))
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('rejects bad grid dimensions', () => {
    const { errors } = validatePuzzle({ formatVersion: 4, grid: { rows: 0, cols: 9 } })
    expect(paths(errors)).toContain('grid')
  })

  it('rejects connector geometry violations', () => {
    const { errors } = validatePuzzle(doc({
      constraints: {
        differenceDots: [{ cells: ['r1c1', 'r3c3'], value: 1 }],
        quadruples: [
          { cells: ['r1c1', 'r1c2', 'r2c1'], values: [1] },
          { cells: ['r4c4', 'r4c5', 'r5c4', 'r5c5'], values: [1, 2, 3, 4, 5] },
        ],
      },
    }))
    expect(errors.some((e) => e.message.includes('orthogonally adjacent'))).toBe(true)
    expect(errors.some((e) => e.message.includes('exactly 4 cells'))).toBe(true)
    expect(errors.some((e) => e.message.includes('at most 4 digits'))).toBe(true)
  })

  it('rejects outer clues off the ring', () => {
    const { errors } = validatePuzzle(doc({
      constraints: { xSums: [{ cell: 'r5c5', value: 10 }, { cell: 'r0c4', value: 10 }] },
    }))
    expect(errors).toHaveLength(1)
    expect(errors[0].path).toBe('constraints.xSums[0].cell')
  })

  it('rejects a cell in two regions', () => {
    const { errors } = validatePuzzle(doc({
      grid: { rows: 9, cols: 9, regions: { '1': ['r1c1'], '2': ['r1c1'] } },
    }))
    expect(errors.some((e) => e.message.includes('one region'))).toBe(true)
  })

  it('reports a flat cell list where cell paths belong as a type mismatch', () => {
    // bulbCells is flat, so writing one arrow's path directly is the natural
    // hand-editing mistake; the got-type points at the missing nesting.
    const { errors } = validatePuzzle(doc({
      constraints: {
        arrows: [{ bulbCells: ['r2c1'], arrows: ['r2c1', 'r2c2'] }],
        thermometers: [{ bulb: 'r1c1', lines: ['r1c1', 'r1c2'] }],
      },
    }))
    expect(errors).toHaveLength(2)
    for (const error of errors) {
      expect(error.message).toBe('expected Array<Array<string>>, got Array<string>')
    }
  })

  it('collapses uniformly wrong-typed elements into one mismatch at the array', () => {
    // One error naming the received type, not one identical error per element.
    const { errors } = validatePuzzle(doc({
      constraints: {
        arrows: [{ bulbCells: ['r2c1'], arrows: [1, 2, 3] as never }],
        killerCages: [{ cells: [1, 2] as never }],
        oddCells: [true, false] as never,
      },
    }))
    expect(errors).toHaveLength(3)
    expect(errors.map((e) => `${e.path}: ${e.message}`).sort()).toEqual([
      'constraints.arrows[0].arrows: expected Array<Array<string>>, got Array<number>',
      'constraints.killerCages[0].cells: expected Array<string>, got Array<number>',
      'constraints.oddCells: expected Array<string>, got Array<boolean>',
    ])
  })

  it('keeps per-element errors for semantic problems in well-typed lists', () => {
    const { errors } = validatePuzzle(doc({
      constraints: { killerCages: [{ cells: ['r1c1', 'banana', 'nope'] }] },
    }))
    expect(errors.map((e) => e.path)).toEqual([
      'constraints.killerCages[0].cells[1]',
      'constraints.killerCages[0].cells[2]',
    ])
  })

  it('rejects wrong container shapes before they can crash hydration', () => {
    const { errors } = validatePuzzle(doc({
      constraints: { thermometers: [{ bulb: 'r1c1', lines: 'r1c1' as never }] },
    }))
    expect(paths(errors)).toContain('constraints.thermometers[0].lines')
  })
})

describe('validatePuzzle warnings (weird but allowed)', () => {
  it('warns on stacked same-location connectors and outer clues', () => {
    const { errors, warnings } = validatePuzzle(doc({
      constraints: {
        differenceDots: [{ cells: ['r1c1', 'r1c2'], value: 1 }],
        ratioDots: [{ cells: ['r1c1', 'r1c2'], value: 2 }],
        xSums: [{ cell: 'r0c4', value: 10 }],
        skyscrapers: [{ cell: 'r0c4', value: 3 }],
      },
    }))
    expect(errors).toHaveLength(0)
    expect(warnings.some((w) => w.message.includes('stacked'))).toBe(true)
    expect(warnings).toHaveLength(2)
  })

  it('warns on unknown keys that will be dropped (catches typos)', () => {
    const { warnings } = validatePuzzle(doc({
      constraints: { thermometrs: [] } as never,
      cosmetics: { sparkles: [] } as never,
      globals: { vortex: {} } as never,
    }))
    expect(warnings.some((w) => w.message.includes('"thermometrs" will be removed'))).toBe(true)
    expect(warnings.some((w) => w.message.includes('"sparkles" will be removed'))).toBe(true)
    expect(warnings.some((w) => w.message.includes('"vortex" will be removed'))).toBe(true)
  })

  it('warns on exclusion conflicts (single-cell pairs and global variants)', () => {
    const { warnings } = validatePuzzle(doc({
      constraints: { oddCells: ['r1c1'], evenCells: ['r1c1'] },
      globals: { diagonals: { positive: true, antiPositive: true } },
    }))
    expect(warnings.some((w) => w.message.includes('is marked as both'))).toBe(true)
    // The registry-later variant is the winner (matches hydrate behavior).
    expect(warnings.some((w) => w.message.includes('mutually exclusive, so "antiPositive" will win'))).toBe(true)
  })

  it('warns on suspicious values without blocking', () => {
    const { errors, warnings } = validatePuzzle(doc({
      givenDigits: { r1c1: 12 },
      constraints: {
        killerCages: [{ cells: ['r1c1', 'r1c2', 'r1c2'], sum: -5 }],
        thermometers: [{ bulb: 'r1c1', lines: [['r1c1', 'r5c5']] }],
      },
      cosmetics: {
        texts: [{ pos: { x: 1.5, y: 1.5 }, content: 'way too long for a cell', preset: 'text-1' }],
        textPresets: [{ id: 'text-1', label: 'T', style: { color: 'blurple', fontSize: 20, bold: false } }],
      },
    }))
    expect(errors).toHaveLength(0)
    expect(warnings.some((w) => w.path === 'givenDigits.r1c1')).toBe(true)
    expect(warnings.some((w) => w.message.includes('not a positive sum'))).toBe(true)
    expect(warnings.some((w) => w.message.includes('same cell more than once'))).toBe(true)
    expect(warnings.some((w) => w.message.includes('not adjacent'))).toBe(true)
    expect(warnings.some((w) => w.message.includes('character limit'))).toBe(true)
    expect(warnings.some((w) => w.message.includes('hex color'))).toBe(true)
  })

  it('passes a clean document with no issues', () => {
    const result = validatePuzzle(doc({
      givenDigits: { r1c1: 5 },
      globals: { chess: { knight: true } },
      constraints: {
        thermometers: [{ bulb: 'r1c1', lines: [['r1c1', 'r2c2']] }],
        quadruples: [{ cells: ['r4c4', 'r4c5', 'r5c4', 'r5c5'], values: [1, 2] }],
        littleKillers: [{ cell: 'r0c0', value: 15, direction: 'down-right' }],
      },
    }))
    expect(result).toEqual({ errors: [], warnings: [] })
  })
})
