import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../types'
import type { FogView } from './constraints/module'
import { projectSpec } from './constraints/registry'
import { buildBoard } from './buildBoard'
import { logicalSolve, describePropagation } from './logic/logicalSolver'
import { valueBit } from './bitmask'

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

function puzzle(overrides: Partial<SolverPuzzle> = {}): SolverPuzzle {
  return { size: 9, regions: vanillaRegions(), givens: [], constraints: [], ...overrides }
}

// All cells lit except the listed ones — the puzzle starts with only `fogged`
// under fog.
function lightsExcept(fogged: number[]): number[] {
  const dark = new Set(fogged)
  return Array.from({ length: 81 }, (_, i) => i).filter((c) => !dark.has(c))
}

const V = (a: number, b: number) => ({ kind: 'connector', relation: 'sum', value: 5, a, b })

const EASY =
  '530070000' + '600195000' + '098000060' +
  '800060003' + '400803001' + '700020006' +
  '060000280' + '000419005' + '000080079'

function easyGivens(except: number[] = []): SolverPuzzle['givens'] {
  const skip = new Set(except)
  const givens: SolverPuzzle['givens'] = []
  for (let i = 0; i < EASY.length; i += 1) {
    if (EASY[i] !== '0' && !skip.has(i)) givens.push({ cell: i, value: Number(EASY[i]) })
  }
  return givens
}

describe('fog gating at build time', () => {
  it('withholds a constraint while all its cells are fogged', () => {
    const p = puzzle({
      constraints: [V(40, 41)],
      fog: { lights: lightsExcept([40, 41]), verified: [] },
    })
    const gated = buildBoard(p, { respectFog: true })
    expect(gated.valid).toBe(true)
    gated.board.bruteForceLogic()
    // V would restrict both cells to 1..4; fogged, they keep all candidates.
    expect(gated.board.candidateMask(40) & valueBit(9)).not.toBe(0)

    const ungated = buildBoard(p)
    ungated.board.bruteForceLogic()
    expect(ungated.board.candidateMask(40) & valueBit(9)).toBe(0)
  })

  it('applies a half-revealed connector fully (either endpoint visible)', () => {
    const p = puzzle({
      constraints: [V(40, 41)],
      fog: { lights: lightsExcept([41]), verified: [] },
    })
    const { board } = buildBoard(p, { respectFog: true })
    board.bruteForceLogic()
    // Both cells prune even though r5c6 is still fogged: the glyph's two-cell
    // footprint is fully determined once either endpoint shows.
    expect(board.candidateMask(40) & valueBit(5)).toBe(0)
    expect(board.candidateMask(41) & valueBit(5)).toBe(0)
  })

  it('withholds a fogged given but commits visible ones', () => {
    const p = puzzle({
      givens: [
        { cell: 0, value: 5 },
        { cell: 80, value: 9 },
      ],
      fog: { lights: lightsExcept([0]), verified: [] },
    })
    const { board, fogGate } = buildBoard(p, { respectFog: true })
    expect(board.isGiven(0)).toBe(false)
    expect(board.isGiven(80)).toBe(true)
    expect(fogGate?.hiddenGivenCells.has(0)).toBe(true)
  })

  it('bounds a partially revealed cage by its visible sum label', () => {
    const cage = { kind: 'killer_cage', cells: [40, 41], sum: 5 }
    const partly = buildBoard(
      puzzle({ constraints: [cage], fog: { lights: lightsExcept([41]), verified: [] } }),
      { respectFog: true },
    )
    partly.board.bruteForceLogic()
    // The label cell (row-major first, r4c4) is visible and the cage visibly
    // continues into fog: at least one hidden cell (≥ 1) still counts, so the
    // visible part sums to at most 4 — but no exact-sum or hidden-cell logic.
    expect(partly.board.candidateMask(40) & valueBit(5)).toBe(0)
    expect(partly.board.candidateMask(40) & valueBit(4)).not.toBe(0)
    expect(partly.board.candidateMask(41) & valueBit(9)).not.toBe(0)

    const fully = buildBoard(
      puzzle({ constraints: [cage], fog: { lights: lightsExcept([]), verified: [] } }),
      { respectFog: true },
    )
    fully.board.bruteForceLogic()
    expect(fully.board.candidateMask(40) & valueBit(9)).toBe(0)
    expect(fully.board.candidateMask(41) & valueBit(9)).toBe(0)
  })

  it('gates a whenAllVisible shape (palindrome) until every cell shows', () => {
    // Palindrome pair r1c1 ↔ r5c2 (no shared row/col/box), with a given 7 on
    // one end: the mirror equality forces the far end only when visible.
    const pal = { kind: 'palindrome', cells: [0, 37] }
    const givens = [{ cell: 0, value: 7 }]
    const partly = buildBoard(
      puzzle({ givens, constraints: [pal], fog: { lights: lightsExcept([37]), verified: [] } }),
      { respectFog: true },
    )
    expect(partly.board.candidateMask(37)).not.toBe(valueBit(7))

    const fully = buildBoard(
      puzzle({ givens, constraints: [pal], fog: { lights: lightsExcept([]), verified: [] } }),
      { respectFog: true },
    )
    expect(fully.board.candidateMask(37)).toBe(valueBit(7))
  })

  it('leaves oracle commands untouched: without respectFog the fog field is ignored', () => {
    const p = puzzle({
      givens: [{ cell: 0, value: 5 }],
      constraints: [V(40, 41)],
      fog: { lights: [], verified: [] },
    })
    const { board, fogGate } = buildBoard(p)
    expect(fogGate).toBeUndefined()
    expect(board.isGiven(0)).toBe(true)
    board.bruteForceLogic()
    expect(board.candidateMask(40) & valueBit(5)).toBe(0)
  })

  it('creates no gate for non-fog puzzles even with respectFog', () => {
    const { fogGate } = buildBoard(puzzle(), { respectFog: true })
    expect(fogGate).toBeUndefined()
  })
})

// Hand-rolled fog view over an explicit fogged set, for projection unit tests.
function fogView(fogged: number[], size = 9): FogView {
  const dark = new Set(fogged)
  return {
    rows: size,
    cols: size,
    anyFog: dark.size > 0,
    isFogged: (cell) => dark.has(cell),
    allVisible: (cells) => cells.every((c) => !dark.has(c)),
    anyVisible: (cells) => cells.some((c) => !dark.has(c)),
  }
}

describe('partial-visibility projections', () => {
  it('arrow: full shafts and bulb-connected prefixes project; orphans vanish', () => {
    const spec = { kind: 'arrow', bulb: [40], shafts: [[41, 42], [39, 38, 37]] }
    // Everything visible → the spec itself (cross-shaft logic intact).
    expect(projectSpec(spec, fogView([]))).toEqual([spec])
    // Bulb fogged → nothing, even with both stems fully visible (the gotcha:
    // the player cannot tell which arrow the stems belong to).
    expect(projectSpec(spec, fogView([40]))).toEqual([])
    // Bulb + first shaft visible; second shaft fogged mid-way: the full shaft
    // keeps exact arrow semantics, the other contributes its visible prefix
    // with the ≥ +1 hidden-cell bound. The cell past the gap (37) is dropped.
    expect(projectSpec(spec, fogView([38]))).toEqual([
      { kind: 'arrow', bulb: [40], shafts: [[41, 42]] },
      { kind: 'arrow_prefix', bulb: [40], prefix: [39] },
    ])
  })

  it('killer cage: visible components split, sum bounds only the label component', () => {
    // L-shaped cage r4c4-r4c5-r5c5 (label = r4c4) plus r6c5; fog r5c5 splits it.
    const spec = { kind: 'killer_cage', cells: [40, 41, 50, 59], sum: 20 }
    expect(projectSpec(spec, fogView([50]))).toEqual([
      { kind: 'killer_cage', cells: [40, 41], sum: null },
      { kind: 'sum_at_most', cells: [40, 41], max: 19 },
    ])
    // The lone r6c5 component is a single cell — no all-different to state, and
    // no sum (it is not knowably the label's cage through the fog).
  })

  it('quadruple: only digits whose rendered position touches a visible cell project', () => {
    // Corner at r5c5: TL=40, TR=41, BL=49, BR=50. Two digits sit left/right on
    // the horizontal boundary, straddling their two side cells each.
    const spec = {
      kind: 'quadruple',
      cells: [40, 41, 49, 50],
      required: [1, 2],
      digitCells: [
        [40, 49],
        [41, 50],
      ],
    }
    expect(projectSpec(spec, fogView([]))).toEqual([spec])
    // Right half fogged: only the lower digit (left position) is readable.
    expect(projectSpec(spec, fogView([41, 50]))).toEqual([
      { kind: 'quadruple', cells: [40, 41, 49, 50], required: [1] },
    ])
    // Whole glyph fogged: nothing.
    expect(projectSpec(spec, fogView([40, 41, 49, 50]))).toEqual([])
  })

  it('thermometer: edges activate along visible chains from a visible bulb', () => {
    const spec = { kind: 'thermometer', edges: [[40, 41], [41, 42]] }
    // Tip fogged: both edges still known — the line visibly exits into fog.
    expect(projectSpec(spec, fogView([42]))).toEqual([{ kind: 'thermometer', edges: [[40, 41], [41, 42]] }])
    // Middle fogged: the far edge is beyond the gap — the player cannot even
    // tell it belongs to this thermo.
    expect(projectSpec(spec, fogView([41]))).toEqual([{ kind: 'thermometer', edges: [[40, 41]] }])
    // Bulb fogged: an orphan fragment reveals no direction at all.
    expect(projectSpec(spec, fogView([40]))).toEqual([])
  })

  it('group cycle line: d1 pairs need either cell, d2 the middle, d3 both middles', () => {
    const spec = { kind: 'group_cycle_line', cells: [40, 41, 42, 43], partition: 'mod3' }
    const projected = projectSpec(spec, fogView([41]))
    expect(projected).toEqual([
      {
        kind: 'group_cycle_line',
        cells: [40, 41, 42, 43],
        partition: 'mod3',
        // d1: (40,41) and (41,42) via their visible ends, (42,43) fully visible.
        // d2: (40,42) needs 41 (fogged) — dropped; (41,43) needs 42 — kept.
        near: [
          [40, 41],
          [41, 42],
          [42, 43],
          [41, 43],
        ],
        // d3: (40,43) needs middles 41 and 42 — 41 is fogged.
        far: [],
        full: false,
      },
    ])
  })

  it('anti-XV: only borders with a visible cell are judged', () => {
    const spec = { kind: 'anti_xv', sum: 5, exempt: [] }
    expect(projectSpec(spec, fogView([]))).toEqual([spec])
    const projected = projectSpec(spec, fogView([0, 1])) as unknown as Array<{ pairs: Array<[number, number]> }>
    expect(projected).toHaveLength(1)
    const pairKeys = new Set(projected[0].pairs.map(([a, b]) => `${a}|${b}`))
    // The border between the two fogged cells is unjudgeable...
    expect(pairKeys.has('0|1')).toBe(false)
    // ...but borders from a fogged cell to a visible one are.
    expect(pairKeys.has('1|2')).toBe(true)
    expect(pairKeys.has('0|9')).toBe(true)
  })
})

describe('partial-visibility deductions on the board', () => {
  it('bounds an arrow bulb from a visible prefix continuing into fog', () => {
    const arrow = { kind: 'arrow', bulb: [40], shafts: [[41, 42, 43]] }
    const { board } = buildBoard(
      puzzle({ constraints: [arrow], fog: { lights: lightsExcept([42, 43]), verified: [] } }),
      { respectFog: true },
    )
    board.bruteForceLogic()
    // bulb ≥ min(prefix) + 1 = 2, and the prefix cell fits under bulbMax - 1.
    expect(board.candidateMask(40) & valueBit(1)).toBe(0)
    expect(board.candidateMask(41) & valueBit(9)).toBe(0)
    // The fogged shaft cells are untouched by arrow logic.
    expect(board.candidateMask(42) & valueBit(9)).not.toBe(0)
  })

  it('applies whisper pairs across a fog boundary but not beyond it', () => {
    const whisper = { kind: 'whisper', cells: [40, 41, 42], threshold: 5 }
    const { board } = buildBoard(
      puzzle({
        givens: [{ cell: 40, value: 9 }],
        constraints: [whisper],
        fog: { lights: lightsExcept([41, 42]), verified: [] },
      }),
      { respectFog: true },
    )
    board.bruteForceLogic()
    // Pair (r4c4, r4c5) is judgeable via the visible end: |9 − b| ≥ 5 → b ≤ 4.
    expect(board.candidateMask(41) & (valueBit(5) | valueBit(6) | valueBit(7) | valueBit(8))).toBe(0)
    expect(board.candidateMask(41) & valueBit(4)).not.toBe(0)
    // Pair (r4c5, r4c6) is fully fogged: r4c6 keeps mid-range digits.
    expect(board.candidateMask(42) & valueBit(5)).not.toBe(0)
  })
})

describe('arrow fog helper projections (setter-declared rules-text facts)', () => {
  const HELPERS = { singleBulb: true, noCrossings: true }

  it('singleBulb alone bounds visible shafts of a fogged bulb, without arrow identity', () => {
    const spec = { kind: 'arrow', bulb: [40], shafts: [[41, 42], [39, 38]], helpers: { singleBulb: true } }
    // Both shafts fully visible, but without noCrossings the bulb cannot be
    // pinned: each shaft only totals ≤ 9 (a single-digit bulb somewhere).
    expect(projectSpec(spec, fogView([40]))).toEqual([
      { kind: 'sum_at_most', cells: [41, 42], max: 9, name: 'Arrow' },
      { kind: 'sum_at_most', cells: [39, 38], max: 9, name: 'Arrow' },
    ])
  })

  it('convergence pins a shared fogged bulb when ≥2 full shafts and noCrossings', () => {
    const spec = { kind: 'arrow', bulb: [40], shafts: [[41, 42], [39, 38]], helpers: HELPERS }
    expect(projectSpec(spec, fogView([40]))).toEqual([
      { kind: 'arrow', bulb: [40], shafts: [[41, 42], [39, 38]] },
    ])
  })

  it('convergence needs at least two fully visible shafts', () => {
    const spec = { kind: 'arrow', bulb: [40], shafts: [[41, 42], [39, 38]], helpers: HELPERS }
    // Second shaft's tip fogged: only one directional stem — a lone path could
    // continue through the fogged cell, so no bulb is pinned.
    expect(projectSpec(spec, fogView([40, 38]))).toEqual([
      { kind: 'sum_at_most', cells: [41, 42], max: 9, name: 'Arrow' },
      { kind: 'sum_at_most', cells: [39], max: 8, name: 'Arrow' },
    ])
  })

  it('convergence needs a single-cell bulb; a fogged pill only yields bounds', () => {
    const spec = { kind: 'arrow', bulb: [40, 49], shafts: [[41, 42], [39, 38]], helpers: HELPERS }
    const projected = projectSpec(spec, fogView([40, 49]))
    expect(projected.every((s) => s.kind === 'sum_at_most')).toBe(true)
  })

  it('bounds a mid-shaft fragment at ≤ 8 (the hidden arrowhead adds at least 1)', () => {
    const spec = { kind: 'arrow', bulb: [40], shafts: [[41, 42, 43]], helpers: { singleBulb: true } }
    expect(projectSpec(spec, fogView([40, 41, 43]))).toEqual([
      { kind: 'sum_at_most', cells: [42], max: 8, name: 'Arrow' },
    ])
  })

  it('with a visible bulb, bounds runs beyond the fog gap that the prefix logic misses', () => {
    const spec = { kind: 'arrow', bulb: [40], shafts: [[41, 42, 43]], helpers: { singleBulb: true } }
    expect(projectSpec(spec, fogView([42]))).toEqual([
      { kind: 'arrow_prefix', bulb: [40], prefix: [41] },
      { kind: 'sum_at_most', cells: [43], max: 8, name: 'Arrow' },
    ])
  })

  it('without helpers a fogged bulb still contributes nothing (pinned)', () => {
    const spec = { kind: 'arrow', bulb: [40], shafts: [[41, 42], [39, 38]] }
    expect(projectSpec(spec, fogView([40]))).toEqual([])
  })
})

describe('killer cage connectivity opt-out', () => {
  it('weakens the label-component bound from sum−1 to sum', () => {
    const cells = [40, 41, 50, 59]
    const connected = { kind: 'killer_cage', cells, sum: 20 }
    const maybeNot = { kind: 'killer_cage', cells, sum: 20, maybeDisconnected: true }
    const boundOf = (spec: SolverConstraintSpec) =>
      (projectSpec(spec, fogView([50])) as Array<{ kind: string; max?: number }>).find((s) => s.kind === 'sum_at_most')?.max
    expect(boundOf(connected)).toBe(19)
    expect(boundOf(maybeNot)).toBe(20)
  })
})

describe('propagation attribution on rebuilt boards', () => {
  it('does not report propagation into already-placed cells (the step-loop bug)', () => {
    // Both V cells already hold digits: committing the 1 at build time fires
    // the V links into the 4's still-full mask, on EVERY rebuild. Those
    // eliminations are invisible (the cell shows its 4) and never become
    // center marks, so reporting them would repeat the same "Connector
    // propagation → R3C4≠…" step forever with no grid change.
    const p = puzzle({
      constraints: [V(12, 21)],
      placed: [
        { cell: 12, value: 1 },
        { cell: 21, value: 4 },
      ],
    })
    const { board, valid } = buildBoard(p, { logPropagation: true })
    expect(valid).toBe(true)
    expect(describePropagation(board)).toBeNull()
  })

  it('still reports propagation into open cells', () => {
    const p = puzzle({ constraints: [V(12, 21)], placed: [{ cell: 12, value: 1 }] })
    const { board } = buildBoard(p, { logPropagation: true })
    const desc = describePropagation(board)
    expect(desc).toContain('Connector propagation')
    expect(desc).toContain('R3C4≠2')
  })
})

describe('projection monotonicity', () => {
  // Deterministic PRNG so the sweep is reproducible.
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

  it('gated candidates always contain the ungated ones (projections never invent)', () => {
    const constraints = [
      // Truthful helper declarations (single-cell bulb, one arrow) so the
      // helper-unlocked projections join the monotonicity sweep.
      { kind: 'arrow', bulb: [40], shafts: [[41, 42]], helpers: { singleBulb: true, noCrossings: true } },
      { kind: 'killer_cage', cells: [20, 21, 30], sum: 15 },
      { kind: 'killer_cage', cells: [60, 61], sum: 9, maybeDisconnected: true },
      { kind: 'whisper', cells: [60, 61, 62], threshold: 5 },
      { kind: 'thermometer', edges: [[0, 9], [9, 18]] },
      { kind: 'quadruple', cells: [49, 50, 58, 59], required: [1, 2], digitCells: [[49, 58], [50, 59]] },
      { kind: 'anti_xv', sum: 5, exempt: [] },
      { kind: 'group_cycle_line', cells: [72, 73, 74, 75], partition: 'mod3' },
      { kind: 'connector', relation: 'sum', value: 10, a: 66, b: 67 },
      { kind: 'palindrome', cells: [2, 47] },
    ]
    const givens = [
      { cell: 4, value: 6 },
      { cell: 76, value: 2 },
    ]
    const ungated = buildBoard(puzzle({ givens, constraints }))
    expect(ungated.valid).toBe(true)
    ungated.board.bruteForceLogic()

    const rand = mulberry32(0xf06)
    for (let round = 0; round < 20; round += 1) {
      const fogged = Array.from({ length: 81 }, (_, i) => i).filter(() => rand() < 0.4)
      const gated = buildBoard(
        puzzle({ givens, constraints, fog: { lights: lightsExcept(fogged), verified: [] } }),
        { respectFog: true },
      )
      expect(gated.valid).toBe(true)
      gated.board.bruteForceLogic()
      for (let cell = 0; cell < 81; cell += 1) {
        const full = ungated.board.candidateMask(cell)
        const partial = gated.board.candidateMask(cell)
        // Everything possible under full knowledge stays possible under fog.
        expect(partial & full).toBe(full)
      }
    }
  })
})

describe('fog reveal during logical solve', () => {
  it('activates a revealed constraint via sync and reports the reveal', () => {
    const p = puzzle({
      constraints: [V(40, 41)],
      fog: { lights: lightsExcept([40, 41]), verified: [] },
    })
    const { board, fogGate } = buildBoard(p, { respectFog: true })
    expect(fogGate).toBeDefined()
    expect(board.candidateMask(40) & valueBit(9)).not.toBe(0)

    // Simulate a solver placement next to the fogged pair: r3c3 clears the 3x3
    // block r2..4 c2..4, revealing r4c4 (cell 40) but not r4c5 (cell 41).
    expect(board.setAsGiven(30, 1)).toBe(true)
    const result = fogGate!.sync(board)
    expect(result.invalid).toBe(false)
    // The V is fully usable half-revealed: both cells drop 5..9 once the
    // activated constraint's own logic runs.
    board.bruteForceLogic()
    expect(board.candidateMask(40) & valueBit(5)).toBe(0)
    expect(board.candidateMask(41) & valueBit(5)).toBe(0)
  })

  it('re-fires committed weak links when a constraint activates late', () => {
    const p = puzzle({
      constraints: [V(40, 41)],
      fog: { lights: lightsExcept([40, 41]), verified: [] },
    })
    const { board, fogGate } = buildBoard(p, { respectFog: true })
    // The solver placed into fog (allowed) before the V was visible; the digit
    // committed with no V links to fire.
    expect(board.setAsGiven(40, 2)).toBe(true)
    const result = fogGate!.sync(board)
    expect(result.invalid).toBe(false)
    // Reveal: the placement verifies, clearing both V cells; the V activates
    // and its links must fire retroactively against the committed 2.
    expect(board.candidateMask(41)).toBe(valueBit(3))
    expect(result.lines.some((l) => l.startsWith('Fog reveals new clues'))).toBe(true)
  })

  it('is a no-op when a step placed nothing new', () => {
    const p = puzzle({
      constraints: [V(40, 41)],
      fog: { lights: lightsExcept([40, 41]), verified: [] },
    })
    const { board, fogGate } = buildBoard(p, { respectFog: true })
    expect(fogGate!.sync(board).lines).toEqual([])
  })

  it('is a no-op when placements reveal nothing new', () => {
    const p = puzzle({
      givens: [{ cell: 0, value: 5 }],
      constraints: [V(40, 41)],
      fog: { lights: lightsExcept([40, 41]), verified: [] },
    })
    const { board, fogGate } = buildBoard(p, { respectFog: true })
    // r9c9 is nowhere near the fogged pair; fog cannot recede.
    expect(board.setAsGiven(80, 9)).toBe(true)
    expect(fogGate!.sync(board).lines).toEqual([])
    expect(board.candidateMask(40) & valueBit(9)).not.toBe(0)
  })

  it('commits a hidden given once fog clears it, with a readout line', () => {
    // The top-left given (5 at r1c1) starts fogged; solving the rest reveals it.
    const p = puzzle({
      givens: easyGivens(),
      fog: { lights: lightsExcept([0]), verified: [] },
    })
    const { board, fogGate } = buildBoard(p, { respectFog: true })
    expect(board.isGiven(0)).toBe(false)
    const solve = logicalSolve(board, {}, { afterStep: (b) => fogGate!.sync(b) })
    expect(solve.solved).toBe(true)
    expect(solve.desc.some((l) => l === 'Fog clears R1C1: given 5')).toBe(true)
    expect(board.isGiven(0)).toBe(true)
  })

  it('does not verify a solver deduction on a hidden given cell', () => {
    // Only the hidden given's own 3x3 area is dark, so nothing but a verified
    // digit adjacent to it could clear it — and deducing the hidden given's own
    // digit must not count (a player can never place there).
    const dark = [0, 1, 9, 10]
    const p = puzzle({
      givens: [{ cell: 0, value: 5 }],
      fog: { lights: lightsExcept(dark), verified: [] },
    })
    const { board, fogGate } = buildBoard(p, { respectFog: true })
    // The solver somehow deduces r1c1=5 (its actual value).
    expect(board.setAsGiven(0, 5)).toBe(true)
    const result = fogGate!.sync(board)
    expect(result.invalid).toBe(false)
    // No reveal: givens never verify, so its neighbours stay dark.
    expect(result.lines).toEqual([])
  })
})
