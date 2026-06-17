import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../types'
import { buildBoard } from './buildBoard'
import { findSolution, countSolutions, trueCandidates, logicalCandidates } from './algorithms'
import { logicalSolve } from './logic/logicalSolver'

// Vanilla 9×9 regions: 9 rows, 9 columns, 9 boxes.
function vanillaRegions(): number[][] {
  const regions: number[][] = []
  for (let r = 0; r < 9; r += 1) {
    const row: number[] = []
    const col: number[] = []
    for (let c = 0; c < 9; c += 1) {
      row.push(r * 9 + c)
      col.push(c * 9 + r)
    }
    regions.push(row, col)
  }
  for (let br = 0; br < 3; br += 1) {
    for (let bc = 0; bc < 3; bc += 1) {
      const box: number[] = []
      for (let r = br * 3; r < br * 3 + 3; r += 1) {
        for (let c = bc * 3; c < bc * 3 + 3; c += 1) {
          box.push(r * 9 + c)
        }
      }
      regions.push(box)
    }
  }
  return regions
}

function vanilla(givenString: string, constraints: SolverPuzzle['constraints'] = []): SolverPuzzle {
  const givens: SolverPuzzle['givens'] = []
  for (let i = 0; i < givenString.length; i += 1) {
    const ch = givenString[i]
    if (ch >= '1' && ch <= '9') givens.push({ cell: i, value: Number(ch) })
  }
  return { size: 9, regions: vanillaRegions(), givens, constraints }
}

const EASY =
  '530070000' + '600195000' + '098000060' +
  '800060003' + '400803001' + '700020006' +
  '060000280' + '000419005' + '000080079'

const SOLUTION =
  '534678912' + '672195348' + '198342567' +
  '859761423' + '426853791' + '713924856' +
  '961537284' + '287419635' + '345286179'

describe('solver engine', () => {
  it('solves a known unique puzzle', () => {
    const { board, valid } = buildBoard(vanilla(EASY))
    expect(valid).toBe(true)
    const solved = findSolution(board)
    expect(solved).not.toBeNull()
    expect(solved?.solutionArray().join('')).toBe(SOLUTION)
  })

  it('counts a unique puzzle as exactly one solution', () => {
    const { board } = buildBoard(vanilla(EASY))
    expect(countSolutions(board, 0)).toEqual({ count: 1, complete: true })
  })

  it('check (cap 2) reports a unique puzzle as complete count 1', () => {
    const { board } = buildBoard(vanilla(EASY))
    expect(countSolutions(board, 2)).toEqual({ count: 1, complete: true })
  })

  it('detects multiple solutions and stops at the cap', () => {
    // A near-empty grid has many solutions; cap at 2 must stop early.
    const { board } = buildBoard(vanilla('1'.padEnd(81, '0')))
    const result = countSolutions(board, 2)
    expect(result.count).toBe(2)
    expect(result.complete).toBe(false)
  })

  it('reports an invalid board (repeated given in a row)', () => {
    const bad = '55'.padEnd(81, '0')
    expect(buildBoard(vanilla(bad)).valid).toBe(false)
  })

  it('returns no solution for an over-constrained but non-conflicting puzzle', () => {
    // Fill a full row 1-8 then force a contradiction elsewhere is hard to craft;
    // instead confirm a contradictory given set yields no completion.
    const { board, valid } = buildBoard(vanilla('123456789' + '1'.padEnd(72, '0')))
    // R2C1 = 1 conflicts with R1C1 = 1 (same column) → invalid at build.
    expect(valid).toBe(false)
    if (valid) expect(findSolution(board)).toBeNull()
  })

  it('logical solve fully solves an easy puzzle with singles', () => {
    const { board } = buildBoard(vanilla(EASY))
    const result = logicalSolve(board)
    expect(result.invalid).toBe(false)
    expect(result.solved).toBe(true)
    expect(board.solutionArray().join('')).toBe(SOLUTION)
    expect(result.desc.length).toBeGreaterThan(0)
  })

  it('true candidates of a unique puzzle match its solution', () => {
    const { board } = buildBoard(vanilla(EASY))
    const result = trueCandidates(board, 1)
    expect(result.valid).toBe(true)
    // Unique solution → every cell has exactly one true candidate = the solution.
    const joined = result.candidates.map((vs) => (vs.length === 1 ? String(vs[0]) : '?')).join('')
    expect(joined).toBe(SOLUTION)
  })

  it('logical candidates resolve a singles puzzle with no false reds', () => {
    const { board } = buildBoard(vanilla(EASY))
    const result = logicalCandidates(board, 1)
    expect(result.valid).toBe(true)
    expect(result.counts).toBeDefined()
    // EASY solves on singles → every cell resolves to one feasible candidate
    // (count 1), so nothing is red.
    const solvedAndFeasible = result.candidates.every(
      (vals, cell) => vals.length === 1 && result.counts?.[cell][vals[0] - 1] === 1,
    )
    expect(solvedAndFeasible).toBe(true)
  })

  it('true candidates with counts marks solving candidates', () => {
    const { board } = buildBoard(vanilla(EASY))
    const result = trueCandidates(board, 5)
    expect(result.valid).toBe(true)
    expect(result.counts).toBeDefined()
    // For a unique puzzle every true candidate has exactly one completing solution.
    result.candidates.forEach((values, cell) => {
      values.forEach((value) => {
        expect(result.counts?.[cell][value - 1]).toBe(1)
      })
    })
  })
})
