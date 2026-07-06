import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { applyPuzzleJson } from '@/utils/puzzleJson'
import type { SerializedPuzzle } from '@/utils/puzzleExport'
import { buildSolverPuzzle } from './adapter'
import { buildBoard } from './engine/buildBoard'
import { logicalStep, logicalSolve } from './engine/logic/logicalSolver'
import { valueBit } from './engine/bitmask'
import oneFoggyChristmasEve from './__fixtures__/oneFoggyChristmasEve.json'
import arrowAmbiguity from './__fixtures__/arrowAmbiguity.json'

// End-to-end fog regressions on two real puzzles: JSON → editor store →
// adapter → gated engine. Cell indices are 0-based row-major (the puzzle JSON
// is 1-indexed: JSON r1c5 = index 4).

function loadPuzzle(json: unknown): void {
  const editor = useEditorStore()
  const grid = useGridStore()
  const result = applyPuzzleJson(editor, grid, json as SerializedPuzzle)
  expect(result.ok).toBe(true)
}

// Enter a digit as the player/solver would (solver scratch, not a given).
function placeDigit(key: string, value: number): void {
  const editor = useEditorStore()
  editor.solverCellStates[key] = { value, cornerMarks: [], centerMarks: [], color: null, colors: [] }
}

describe('One Foggy Christmas Eve (fog regression)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('hides both fogged V clues from the solver at the start', () => {
    loadPuzzle(oneFoggyChristmasEve)
    const { puzzle, supported } = buildSolverPuzzle({ includeSolverState: true, respectFog: true })
    expect(supported).toBe(true)
    expect(puzzle.fog).toBeDefined()
    expect(puzzle.fog?.lights).toHaveLength(14)
    expect(puzzle.fog?.verified).toHaveLength(0)

    const gated = buildBoard(puzzle, { respectFog: true })
    expect(gated.valid).toBe(true)
    gated.board.bruteForceLogic()
    // The r1c5|r1c6 V (indices 4, 5) and r5c1|r6c1 V (36, 45) are fogged: a V
    // would cap both cells at 4, so a surviving 9 proves the clue is withheld.
    expect(gated.board.candidateMask(4) & valueBit(9)).not.toBe(0)
    expect(gated.board.candidateMask(36) & valueBit(9)).not.toBe(0)

    // Without fog the same puzzle applies them (this is the old, leaky behavior).
    const ungated = buildBoard(puzzle)
    ungated.board.bruteForceLogic()
    expect(ungated.board.candidateMask(4) & valueBit(9)).toBe(0)
    expect(ungated.board.candidateMask(36) & valueBit(9)).toBe(0)
  })

  it('makes the half-revealed r1 V fully usable after r2c4=1 and r3c4=4', () => {
    loadPuzzle(oneFoggyChristmasEve)
    // The intended solve path: these two placements clear fog up to row 1,
    // revealing the left half of the V between r1c5 and r1c6.
    placeDigit('r1c3', 1) // JSON r2c4
    placeDigit('r2c3', 4) // JSON r3c4

    const { puzzle } = buildSolverPuzzle({ includeSolverState: true, respectFog: true })
    expect(puzzle.fog?.verified).toContain(12) // r2c4
    expect(puzzle.fog?.verified).toContain(21) // r3c4

    const { board, valid } = buildBoard(puzzle, { respectFog: true })
    expect(valid).toBe(true)
    board.bruteForceLogic()
    // r1c5 (4) is revealed, r1c6 (5) is still fogged — but a connector is
    // always exactly its two cells, so the half-revealed V restricts both.
    expect(board.candidateMask(4) & (valueBit(5) | valueBit(9))).toBe(0)
    expect(board.candidateMask(5) & (valueBit(5) | valueBit(9))).toBe(0)
    // The r5c1|r6c1 V stays hidden and inert.
    expect(board.candidateMask(36) & valueBit(9)).not.toBe(0)
  })

  it('stalls soundly at the start: the intended break-in needs rules-text meta-logic', () => {
    // The bulb at r2c2 is NOT a fog light. The human break-in pins the bulb by
    // combining the rules text ("arrows do not overlap or cross") with the two
    // stems converging into one dark cell — puzzle-specific reasoning the
    // solver must never assume (cf. the arrow-ambiguity gotcha). So a fogged
    // logical solve may use the two visible Vs but place nothing.
    loadPuzzle(oneFoggyChristmasEve)
    const { puzzle } = buildSolverPuzzle({ respectFog: true })
    expect(puzzle.fog?.verified).toHaveLength(0)

    const { board, valid, fogGate } = buildBoard(puzzle, { respectFog: true })
    expect(valid).toBe(true)
    const givensBefore = board.givenCount
    const solve = logicalSolve(board, {}, { afterStep: (b) => fogGate!.sync(b) })
    expect(solve.invalid).toBe(false)
    expect(solve.solved).toBe(false)
    expect(board.givenCount).toBe(givensBefore)
    // Every step it did take came from the two visible V connectors.
    for (const line of solve.desc) {
      if (line !== 'No logical steps') expect(line).toContain('Connector')
    }
  })

  it('makes the break-in itself when the arrow fog helpers are declared', () => {
    // "Enforce single-cell bulbs" + "no crossings" let the solver reason like
    // the rules text: both visible stems exit into the same fogged cell, so it
    // must be their shared single-cell bulb — and the joint shaft logic plus
    // the row-visible 8 pin it to 9. The user's step 1, derived soundly.
    loadPuzzle(oneFoggyChristmasEve)
    const editor = useEditorStore()
    editor.fogSolverHelpers = { arrowSingleCellBulbs: true, arrowNoCrossings: true }

    const { puzzle } = buildSolverPuzzle({ respectFog: true })
    const { board, valid, fogGate } = buildBoard(puzzle, { respectFog: true })
    expect(valid).toBe(true)
    const solve = logicalSolve(board, {}, { afterStep: (b) => fogGate!.sync(b) })
    expect(solve.invalid).toBe(false)
    expect(board.isGiven(10)).toBe(true) // r2c2 placed…
    expect(board.candidateMask(10)).toBe(valueBit(9)) // …as the 9
    expect(solve.desc.some((line) => line.includes('R2C2 = 9'))).toBe(true)
  })

  it('solves the whole puzzle with helpers plus the contradiction-check technique', () => {
    // The intended steps 3-4 are trial-based ("if r3c4 were 1, both arrows
    // would need 234"), which is exactly the opt-in lookahead technique.
    loadPuzzle(oneFoggyChristmasEve)
    const editor = useEditorStore()
    editor.fogSolverHelpers = { arrowSingleCellBulbs: true, arrowNoCrossings: true }

    const { puzzle } = buildSolverPuzzle({ respectFog: true })
    const { board, valid, fogGate } = buildBoard(puzzle, { respectFog: true })
    expect(valid).toBe(true)
    const solve = logicalSolve(board, { contradictionCheck: true }, { afterStep: (b) => fogGate!.sync(b) })
    expect(solve.invalid).toBe(false)
    expect(solve.solved).toBe(true)
    expect(board.givenCount).toBe(81)
  })

  it("continues the intended path once the player's break-in 9 is placed at r2c2", () => {
    loadPuzzle(oneFoggyChristmasEve)
    // Step 1 of the intended path is the player's: r2c2 = 9. Its reveal makes
    // both arrows fully visible, and the solver reproduces steps 2+.
    placeDigit('r1c1', 9) // JSON r2c2

    const { puzzle } = buildSolverPuzzle({ includeSolverState: true, respectFog: true })
    const { board, valid, fogGate } = buildBoard(puzzle, { respectFog: true })
    expect(valid).toBe(true)
    const solve = logicalSolve(board, {}, { afterStep: (b) => fogGate!.sync(b) })
    expect(solve.invalid).toBe(false)
    expect(solve.changed).toBe(true)
    // The user's step 2: the down arrow (summing to the 9) cannot contain a 5,
    // and the 2 is eliminated from r2c3 and r3c4. (0-indexed: r2c1=19 is JSON
    // r3c2; r1c2=11 is JSON r2c3; r2c3=21 is JSON r3c4.)
    expect(board.candidateMask(19) & valueBit(5)).toBe(0)
    expect(board.candidateMask(11) & valueBit(2)).toBe(0)
    expect(board.candidateMask(21) & valueBit(2)).toBe(0)
  })
})

describe('arrow ambiguity gotcha (fog regression)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('deduces nothing from revealed arrow stems whose bulbs are fogged', () => {
    loadPuzzle(arrowAmbiguity)
    const { puzzle } = buildSolverPuzzle({ includeSolverState: true, respectFog: true })
    expect(puzzle.constraints.filter((c) => c.kind === 'arrow')).toHaveLength(4)

    const gated = buildBoard(puzzle, { respectFog: true })
    expect(gated.valid).toBe(true)
    // Six stem cells are revealed, but every bulb is fogged and the stems'
    // connectivity is hidden — three different resolutions remain possible, so
    // NO arrow knowledge may reach the board.
    expect(gated.board.constraints).toHaveLength(0)
    const step = logicalStep(gated.board, {})
    expect(step.changed).toBe(false)
    expect(step.desc).toBe('No logical steps')

    // Sanity check: ungated, the arrows do constrain the board.
    const ungated = buildBoard(puzzle)
    expect(ungated.board.constraints.length).toBeGreaterThan(0)
  })
})
