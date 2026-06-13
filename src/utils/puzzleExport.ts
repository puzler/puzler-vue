import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'
import { cellKey } from '@/composables/useGrid'

// Bumped from 1 when constraint state beyond cosmetics (single-cell marks,
// connector dots, outer clues, global variants) joined the export
export const PUZZLE_EXPORT_VERSION = 2

type EditorStore = ReturnType<typeof useEditorStore>
type GridStore = ReturnType<typeof useGridStore>

export type SerializedPuzzle = ReturnType<typeof serializePuzzle>

// Serializes the full editor state as a JSON-safe object: everything is
// plain data (Sets become sorted arrays) so the output round-trips through
// JSON.stringify/parse without loss for a future import.
export function serializePuzzle(
  editor: ReturnType<typeof useEditorStore>,
  grid: ReturnType<typeof useGridStore>,
) {
  return {
    version: PUZZLE_EXPORT_VERSION,
    grid: {
      rows: grid.rows,
      cols: grid.cols,
      customCellRegions: grid.customCellRegions,
    },
    meta: {
      name: editor.puzzleName,
      author: editor.puzzleAuthor,
      rules: editor.puzzleRules,
    },
    givenDigits: editor.givenDigits,
    solverCellStates: editor.solverCellStates,
    activeConstraints: editor.activeConstraints,
    globals: {
      variants: Array.from(editor.activeGlobalVariants).sort(),
      custom: editor.customGlobalConstraints,
    },
    constraints: {
      // type → sorted cell keys (Sets in the store)
      singleCellMarks: Object.fromEntries(
        Object.entries(editor.singleCellMarks).map(([type, cells]) => [type, Array.from(cells).sort()]),
      ),
      // border/corner key → { type, value } (difference/ratio dots, XV, quadruples)
      connectorDots: editor.connectorDots,
      // outer ring key → { type, value, direction? } (x-sums, sandwich, skyscrapers, little killers)
      outerClues: editor.outerClues,
    },
    cosmetics: {
      cellColors: editor.cosmeticCellColors,
      instances: editor.cosmeticInstances,
      linePresets: editor.linePresets,
      shapePresets: editor.shapePresets,
      textPresets: editor.textPresets,
      cellColorPresets: editor.cellColorPresets,
      cagePresets: editor.cagePresets,
    },
  }
}

// Inverse of serializePuzzle: hydrates the editor and grid stores from a stored
// definition. reset() first gives a clean slate and clears undo history, so
// loading a version is not itself an undoable step. Arrays become Sets again.
export function deserializePuzzle(editor: EditorStore, grid: GridStore, data: SerializedPuzzle) {
  editor.reset()

  grid.setDimensions(data.grid.rows, data.grid.cols)
  grid.setCustomCellRegions(data.grid.customCellRegions ?? null)

  editor.puzzleName = data.meta.name ?? ''
  editor.puzzleAuthor = data.meta.author ?? ''
  editor.puzzleRules = data.meta.rules ?? ''

  editor.givenDigits = { ...data.givenDigits }
  editor.solverCellStates = structuredClone(data.solverCellStates)
  editor.activeConstraints = data.activeConstraints.map((c) => ({ ...c }))

  editor.activeGlobalVariants = new Set(data.globals.variants)
  editor.customGlobalConstraints = data.globals.custom.map((c) => ({ ...c }))

  editor.singleCellMarks = Object.fromEntries(
    Object.entries(data.constraints.singleCellMarks).map(([type, cells]) => [type, new Set(cells)]),
  )
  editor.connectorDots = structuredClone(data.constraints.connectorDots)
  editor.outerClues = structuredClone(data.constraints.outerClues)

  editor.cosmeticCellColors = { ...data.cosmetics.cellColors }
  editor.cosmeticInstances = structuredClone(data.cosmetics.instances)
  editor.linePresets = structuredClone(data.cosmetics.linePresets)
  editor.shapePresets = structuredClone(data.cosmetics.shapePresets)
  editor.textPresets = structuredClone(data.cosmetics.textPresets)
  editor.cellColorPresets = structuredClone(data.cosmetics.cellColorPresets)
  editor.cagePresets = structuredClone(data.cosmetics.cagePresets)

  // Point the active-preset selectors at the restored presets (reset() left
  // them on freshly-generated default ids).
  if (data.cosmetics.linePresets[0]) editor.activeLinePresetId = data.cosmetics.linePresets[0].id
  if (data.cosmetics.shapePresets[0]) editor.activeShapePresetId = data.cosmetics.shapePresets[0].id
  if (data.cosmetics.textPresets[0]) editor.activeTextPresetId = data.cosmetics.textPresets[0].id
  if (data.cosmetics.cellColorPresets[0]) editor.activeCellColorPresetId = data.cosmetics.cellColorPresets[0].id
  if (data.cosmetics.cagePresets[0]) editor.activeCagePresetId = data.cosmetics.cagePresets[0].id
}

// The solution is the fully-filled grid (givens plus solver-entered digits).
// Returns null unless every cell has a value, so a partially-solved draft saves
// without a solution and simply can't be published until it's complete.
export function buildSolution(editor: EditorStore, grid: GridStore): Record<string, number> | null {
  const solution: Record<string, number> = {}
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const value = editor.givenDigits[key] ?? editor.solverCellStates[key]?.value ?? null
      if (value === null) return null
      solution[key] = value
    }
  }
  return solution
}
