import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'
import { cellKey } from '@/composables/useGrid'

// 1 → 2: constraint state beyond cosmetics joined the export.
// 2 → 3: solver scratch (solverCellStates) dropped from puzzle data; the
// explicit solution and solve message joined instead.
export const PUZZLE_EXPORT_VERSION = 3

type EditorStore = ReturnType<typeof useEditorStore>
type GridStore = ReturnType<typeof useGridStore>

export type SerializedPuzzle = ReturnType<typeof serializePuzzle>

// Serializes the puzzle as a JSON-safe object: everything is plain data (Sets
// become sorted arrays) so the output round-trips through JSON.stringify/parse.
// This is the export/import shape. It deliberately excludes solverCellStates —
// the solver's scratch is never puzzle data — and carries the explicit solution
// and solve message instead.
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
      solveMessage: editor.solveMessage,
    },
    solution: editor.solution,
    givenDigits: editor.givenDigits,
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
  editor.solveMessage = data.meta.solveMessage ?? ''
  editor.solution = data.solution ?? null

  editor.givenDigits = { ...data.givenDigits }
  // solverCellStates is deliberately not restored — it's ephemeral scratch,
  // never part of stored puzzle data, so it stays empty from reset().
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

// The map of currently-filled cells (givens plus solver-entered digits), empty
// cells omitted. Used both to capture the author's solution and to check a
// player's board against the solution hash — so variants that intentionally
// leave cells blank work: the solution simply doesn't include those cells.
export function boardSnapshot(editor: EditorStore, grid: GridStore): Record<string, number> {
  const board: Record<string, number> = {}
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      const value = editor.givenDigits[key] ?? editor.solverCellStates[key]?.value ?? null
      if (value !== null) board[key] = value
    }
  }
  return board
}

// Parses and shape-validates pasted import JSON, throwing a readable error for
// the import UI. Tolerates older export versions (deserialize fills gaps).
export function parsePuzzleImport(text: string): SerializedPuzzle {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That doesn't look like valid JSON.")
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('Expected a puzzle object.')
  }
  const obj = data as Record<string, unknown>
  const grid = obj.grid as { rows?: unknown; cols?: unknown } | undefined
  if (!grid || typeof grid.rows !== 'number' || typeof grid.cols !== 'number') {
    throw new Error('Missing or invalid grid dimensions — is this a Puzler export?')
  }
  if (typeof obj.version !== 'number' || obj.version > PUZZLE_EXPORT_VERSION) {
    throw new Error('Unsupported puzzle format version.')
  }
  return data as SerializedPuzzle
}
