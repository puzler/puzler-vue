import { describe, it, expect } from 'vitest'
import type { AdapterContext } from '../../adapterContext'
import { outerRuns, diagonalLine } from './outerHelpers'
import xSum from './xSum'
import rossini from './rossini'
import littleKiller from './littleKiller'

// Outer clues on voided grids: lines are maximal LIVE runs from the clue, and
// a clue may live IN a void cell, reading every adjacent run. The playground
// is a 3×3 with r0c2 (index 2) void: its row reads leftward, its column down —
// the conjoined-grids corner clue in miniature.
const VOIDS = new Set([2])

function ctx(outerClues: AdapterContext['outerClues'], voids = VOIDS): AdapterContext {
  return {
    size: 3, rows: 3, cols: 3,
    keyToIndex: (k) => { const m = /^r(\d+)c(\d+)$/.exec(k); return m ? Number(m[1]) * 3 + Number(m[2]) : -1 },
    regionOfCell: () => null,
    voids,
    variants: new Set(), customGlobals: [], fogSolverHelpers: {}, singleCellMarks: {}, connectorDots: [],
    outerClues,
    constraintInstances: [],
  }
}

describe('outerRuns', () => {
  it('gives ring cells their full inward line on a voidless grid', () => {
    expect(outerRuns(3, 3, -1, 0)).toEqual([[0, 3, 6]])
    expect(outerRuns(3, 3, 1, 3)).toEqual([[5, 4, 3]])
  })

  it('stops a ring line at the first void', () => {
    expect(outerRuns(3, 3, -1, 0, new Set([3]))).toEqual([[0]])
  })

  it('reads nothing from a ring cell whose neighbor is void', () => {
    expect(outerRuns(3, 3, -1, 2, VOIDS)).toEqual([])
  })

  it('reads every adjacent live run from a void cell', () => {
    // r0c2: leftward along row 0 and down column 2 — one clue, two lines.
    expect(outerRuns(3, 3, 0, 2, VOIDS)).toEqual([[5, 8], [1, 0]])
  })

  it('reads nothing from live in-grid cells or ring corners', () => {
    expect(outerRuns(3, 3, 1, 1, VOIDS)).toEqual([])
    expect(outerRuns(3, 3, -1, -1, VOIDS)).toEqual([])
  })

  it('stops a diagonal at the first void', () => {
    expect(diagonalLine(3, 3, -1, -1, 'down-right', new Set([4]))).toEqual([0])
    expect(diagonalLine(3, 3, -1, -1, 'down-right')).toEqual([0, 4, 8])
  })

  it('binds only the runs named by explicit directions', () => {
    // The void at r0c2 reads down and left; the setter toggled the clue to
    // bind only its own grid's row.
    expect(outerRuns(3, 3, 0, 2, VOIDS, ['left'])).toEqual([[1, 0]])
    expect(outerRuns(3, 3, 0, 2, VOIDS, ['down'])).toEqual([[5, 8]])
    expect(outerRuns(3, 3, 0, 2, VOIDS, ['up'])).toEqual([])
    // Ring clues filter too (a doc could name the wrong direction).
    expect(outerRuns(3, 3, -1, 0, new Set(), ['down'])).toEqual([[0, 3, 6]])
    expect(outerRuns(3, 3, -1, 0, new Set(), ['left'])).toEqual([])
  })
})

describe('void-hosted outer clues in the modules', () => {
  it('x-sum in a void emits one spec per adjacent run', () => {
    const specs = xSum.fromEditor(ctx([
      { id: 'x1', type: 'x_sums', location: 'o:r0c2', value: 3 },
    ]))
    expect(specs).toEqual([
      { kind: 'x_sum', line: [5, 8], target: 3 },
      { kind: 'x_sum', line: [1, 0], target: 3 },
    ])
  })

  it('x-sum with toggled directions binds only the named runs', () => {
    const specs = xSum.fromEditor(ctx([
      { id: 'x1', type: 'x_sums', location: 'o:r0c2', value: 3, directions: ['left'] },
    ]))
    expect(specs).toEqual([{ kind: 'x_sum', line: [1, 0], target: 3 }])
  })

  it('rossini in a void keeps only runs long enough to read', () => {
    // Both runs are 2 cells on the 3×3 — too short for rossini's three digits.
    expect(rossini.fromEditor(ctx([
      { id: 'r1', type: 'rossini', location: 'o:r0c2', rossiniDirection: 'increasing', value: null },
    ]))).toEqual([])
    // On a 4×4 with the same void the downward run reaches three cells.
    const specs = rossini.fromEditor({
      ...ctx([{ id: 'r2', type: 'rossini', location: 'o:r0c3', rossiniDirection: 'increasing', value: null }]),
      rows: 4, cols: 4, size: 4,
      voids: new Set([3]),
    })
    expect(specs).toEqual([
      { kind: 'rossini', cells: [7, 11, 15], increasing: true },
      { kind: 'rossini', cells: [2, 1, 0], increasing: true },
    ])
  })

  it('little killer diagonals stop at voids', () => {
    // The main diagonal from the top-left corner hits the void centre: only
    // r0c0 remains in the sum.
    const specs = littleKiller.fromEditor(ctx([
      { id: 'l1', type: 'little_killers', location: 'o:r-1c-1', value: 10, direction: 'down-right' },
    ], new Set([4])))
    expect(specs).toEqual([{ kind: 'little_killer', cells: [0], target: 10 }])
  })
})
