import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockQuery, mockMutate } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockMutate: vi.fn(),
}))

vi.mock('@/utils/apolloClient', () => ({
  apolloClient: { query: mockQuery, mutate: mockMutate },
}))

// serialize/deserialize have their own coverage (puzzleExport.test.ts); stub
// them here so these tests focus on the store's persistence and version-pick
// logic without needing full, valid puzzle definitions.
vi.mock('@/utils/puzzleExport', () => ({
  serializePlayDefinition: vi.fn(() => ({ grid: { rows: 9, cols: 9 } })),
  deserializePuzzle: vi.fn(),
}))

import { usePuzzleStore } from './puzzle'
import { useEditorStore } from './editor'
import { PuzzleStatusEnum, PuzzleVisibilityEnum } from '@/graphql/generated/types'

function versionSummary(id: string, versionNumber: number) {
  return {
    id,
    versionNumber,
    displayName: `v${versionNumber}`,
    label: null,
    isPublished: false,
    constraintTypes: [],
    createdAt: '2026-06-24T00:00:00Z',
  }
}

function puzzleForEdit(versions: ReturnType<typeof versionSummary>[]) {
  return {
    id: 'p1',
    status: PuzzleStatusEnum.Draft,
    visibility: PuzzleVisibilityEnum.Private,
    shareToken: 'tok',
    publishedVersion: null,
    grantedUsers: [],
    authorDifficulty: null,
    title: 'Stored title',
    description: '',
    versions,
  }
}

describe('puzzle store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockQuery.mockReset()
    mockMutate.mockReset()
  })

  describe('saveVersion', () => {
    it('persists the current name and rules to the puzzle row on every save', async () => {
      const editor = useEditorStore()
      editor.puzzleName = 'My Puzzle'
      editor.puzzleRules = 'Normal sudoku rules apply.'
      editor.authorDifficulty = 3

      const puzzle = usePuzzleStore()
      puzzle.serverPuzzleId = 'p1' // already created → skip ensurePuzzle's create path

      mockMutate
        .mockResolvedValueOnce({ data: { savePuzzleVersion: { version: versionSummary('v2', 2), errors: [] } } })
        .mockResolvedValueOnce({ data: { updatePuzzle: { puzzle: { id: 'p1' }, errors: [] } } })

      await puzzle.saveVersion()

      // Second mutation is UpdatePuzzle, carrying the row metadata.
      expect(mockMutate.mock.calls[1][0].variables).toEqual({
        id: 'p1',
        attrs: { title: 'My Puzzle', description: 'Normal sudoku rules apply.', authorDifficulty: 3 },
      })
    })

    it('falls back to "Untitled puzzle" when the name is blank', async () => {
      const editor = useEditorStore()
      editor.puzzleName = '   '

      const puzzle = usePuzzleStore()
      puzzle.serverPuzzleId = 'p1'

      mockMutate
        .mockResolvedValueOnce({ data: { savePuzzleVersion: { version: versionSummary('v1', 1), errors: [] } } })
        .mockResolvedValueOnce({ data: { updatePuzzle: { puzzle: { id: 'p1' }, errors: [] } } })

      await puzzle.saveVersion()

      expect(mockMutate.mock.calls[1][0].variables.attrs.title).toBe('Untitled puzzle')
    })
  })

  describe('loadForEdit', () => {
    it('restores the version with the highest versionNumber regardless of array order', async () => {
      mockQuery
        // PuzzleForEdit: versions deliberately out of order.
        .mockResolvedValueOnce({
          data: { puzzle: puzzleForEdit([versionSummary('a', 2), versionSummary('c', 5), versionSummary('b', 3)]) },
        })
        // PuzzleVersion: the version restoreVersion asks for.
        .mockResolvedValueOnce({
          data: { puzzleVersion: { id: 'c', definition: { grid: { rows: 9, cols: 9 } }, solution: null, solveMessage: null } },
        })

      const puzzle = usePuzzleStore()
      await puzzle.loadForEdit('p1')

      // restoreVersion (the 2nd query) must be asked for the highest-numbered version.
      expect(mockQuery.mock.calls[1][0].variables).toEqual({ id: 'c' })
      expect(puzzle.currentVersionId).toBe('c')
    })

    it('throws when the puzzle is not found', async () => {
      mockQuery.mockResolvedValueOnce({ data: { puzzle: null } })

      const puzzle = usePuzzleStore()
      await expect(puzzle.loadForEdit('missing')).rejects.toThrow('Puzzle not found')
    })
  })
})
