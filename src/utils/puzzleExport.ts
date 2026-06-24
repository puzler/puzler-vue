import { toRaw } from 'vue'
import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'
import { cellKey } from '@/composables/useGrid'
import { cosmeticPos } from '@/types/constraints'
import type { TextData, ShapeData } from '@/types/constraints'

// The export *format* version — the schema of this JSON, not a puzzle's save
// version (v1/v2). Exported as `formatVersion`; bumped when the shape changes.
// 1 → 2: constraint state beyond cosmetics joined the export.
// 2 → 3: solver scratch (solverCellStates) dropped from puzzle data; the
// explicit solution and solve message joined instead.
export const PUZZLE_EXPORT_VERSION = 3

type EditorStore = ReturnType<typeof useEditorStore>
type GridStore = ReturnType<typeof useGridStore>

export type SerializedPuzzle = ReturnType<typeof fullSerialize>

// Builds the complete puzzle object. Everything is plain data (Sets become
// sorted arrays) so it round-trips through JSON. Excludes solverCellStates —
// the solver's scratch is never puzzle data — and carries the explicit solution
// and solve message instead.
function fullSerialize(editor: EditorStore, grid: GridStore) {
  const hasCosmetic = (type: string) => editor.cosmeticInstances.some((i) => i.type === type)
  const hasCellColors = Object.keys(editor.cosmeticCellColors).length > 0
  return {
    formatVersion: PUZZLE_EXPORT_VERSION,
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
      // Presets ship only when the puzzle actually uses that cosmetic kind —
      // otherwise the default preset every store starts with would bloat exports
      // of cosmetic-free puzzles. Empty arrays are pruned by dropEmpty below, so
      // a puzzle with no cosmetics drops the whole cosmetics section.
      linePresets: hasCosmetic('cosmetic_line') ? editor.linePresets : [],
      shapePresets: hasCosmetic('shape') ? editor.shapePresets : [],
      textPresets: hasCosmetic('text') ? editor.textPresets : [],
      cellColorPresets: hasCellColors ? editor.cellColorPresets : [],
      cagePresets: hasCosmetic('cosmetic_cage') ? editor.cagePresets : [],
    },
  }
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// Drops keys whose value is empty (empty array/object, null, '') — shallow, so
// it never recurses into constraint/cosmetic data where an empty array can be
// meaningful (e.g. an empty quadruple).
function dropEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => !isEmptyValue(v)))
}

// Prunes empty containers from the serialized object so a simple puzzle exports
// without a pile of empty maps/arrays. The structural sections are compacted
// first, then the top level (which drops any section emptied by that pass).
function compactExport(data: ReturnType<typeof fullSerialize>): SerializedPuzzle {
  const compacted = {
    ...data,
    grid: dropEmpty(data.grid),
    meta: dropEmpty(data.meta),
    globals: dropEmpty(data.globals),
    constraints: dropEmpty(data.constraints),
    cosmetics: dropEmpty(data.cosmetics),
  }
  return dropEmpty(compacted) as SerializedPuzzle
}

// The export/import shape — clean, with the solution and solve message.
export function serializePuzzle(editor: EditorStore, grid: GridStore): SerializedPuzzle {
  return compactExport(fullSerialize(editor, grid))
}

// The play-safe definition stored on a version: same shape, but the solution
// and solve message are stripped (they live in their own version columns and
// must never reach a solver).
export function serializePlayDefinition(editor: EditorStore, grid: GridStore): SerializedPuzzle {
  const data = fullSerialize(editor, grid)
  return compactExport({ ...data, solution: null, meta: { ...data.meta, solveMessage: '' } })
}

// Inverse of serializePuzzle: hydrates the editor and grid stores from a stored
// definition. reset() first gives a clean slate and clears undo history, so
// loading a version is not itself an undoable step. Arrays become Sets again.
export function deserializePuzzle(editor: EditorStore, grid: GridStore, input: SerializedPuzzle) {
  editor.reset()

  // The import modal holds the parsed JSON in a ref, so Vue hands us a reactive
  // proxy. structuredClone() throws DataCloneError on a proxy, which would abort
  // the restore partway (after the spread-based fields, before connectorDots /
  // outerClues / cosmetics). Unwrap to the raw plain object first; toRaw is a
  // no-op for the already-plain data the version/player paths pass.
  const data = toRaw(input)

  // Empty containers are omitted from the export, so every section is read
  // defensively with a default.
  const meta = data.meta ?? {}
  const globals = data.globals ?? {}
  const constraints = data.constraints ?? {}
  const cosmetics = data.cosmetics ?? {}

  grid.setDimensions(data.grid.rows, data.grid.cols)
  grid.setCustomCellRegions(data.grid.customCellRegions ?? null)

  editor.puzzleName = meta.name ?? ''
  editor.puzzleAuthor = meta.author ?? ''
  editor.puzzleRules = meta.rules ?? ''
  editor.solveMessage = meta.solveMessage ?? ''
  editor.solution = data.solution ?? null

  editor.givenDigits = { ...(data.givenDigits ?? {}) }
  // solverCellStates is deliberately not restored — it's ephemeral scratch,
  // never part of stored puzzle data, so it stays empty from reset().
  editor.activeConstraints = (data.activeConstraints ?? []).map((c) => ({ ...c }))

  editor.activeGlobalVariants = new Set(globals.variants ?? [])
  editor.customGlobalConstraints = (globals.custom ?? []).map((c) => ({ ...c }))

  editor.singleCellMarks = Object.fromEntries(
    Object.entries(constraints.singleCellMarks ?? {}).map(([type, cells]) => [type, new Set(cells)]),
  )
  editor.connectorDots = structuredClone(constraints.connectorDots ?? {})
  editor.outerClues = structuredClone(constraints.outerClues ?? {})

  editor.cosmeticCellColors = { ...(cosmetics.cellColors ?? {}) }
  editor.cosmeticInstances = structuredClone(cosmetics.instances ?? [])

  // Presets are only overwritten when present, so an import that omits them
  // keeps the default preset reset() created (the line/shape tools need one).
  if (cosmetics.linePresets) editor.linePresets = structuredClone(cosmetics.linePresets)
  if (cosmetics.shapePresets) editor.shapePresets = structuredClone(cosmetics.shapePresets)
  if (cosmetics.textPresets) editor.textPresets = structuredClone(cosmetics.textPresets)
  if (cosmetics.cellColorPresets) editor.cellColorPresets = structuredClone(cosmetics.cellColorPresets)
  if (cosmetics.cagePresets) editor.cagePresets = structuredClone(cosmetics.cagePresets)

  // Migrate legacy text/shape cosmetics: presets used to carry the shared text
  // and instances were pinned to a cell (+ anchor). Give each instance its own
  // `pos` and `content` (seeded from the old preset content for text) so the
  // rest of the app only deals with the new free-position model.
  editor.cosmeticInstances = editor.cosmeticInstances.map((inst) => {
    if (inst.type !== 'text' && inst.type !== 'shape') return inst
    const data = inst.data as TextData & ShapeData
    const pos = cosmeticPos(data)
    const content = data.content
      ?? (inst.type === 'text'
        ? (editor.textPresets.find((p) => p.id === data.presetId)?.content ?? '?')
        : '')
    return {
      ...inst,
      data: { presetId: data.presetId, pos, content, ...(data.rotation ? { rotation: data.rotation } : {}) },
    }
  })

  // Point the active-preset selectors at the restored presets (reset() left
  // them on freshly-generated default ids).
  if (cosmetics.linePresets?.[0]) editor.activeLinePresetId = cosmetics.linePresets[0].id
  if (cosmetics.shapePresets?.[0]) editor.activeShapePresetId = cosmetics.shapePresets[0].id
  if (cosmetics.textPresets?.[0]) editor.activeTextPresetId = cosmetics.textPresets[0].id
  if (cosmetics.cellColorPresets?.[0]) editor.activeCellColorPresetId = cosmetics.cellColorPresets[0].id
  if (cosmetics.cagePresets?.[0]) editor.activeCagePresetId = cosmetics.cagePresets[0].id
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
  // `formatVersion` is the current field; older exports carried it as `version`.
  const formatVersion = typeof obj.formatVersion === 'number' ? obj.formatVersion : obj.version
  if (typeof formatVersion !== 'number' || formatVersion > PUZZLE_EXPORT_VERSION) {
    throw new Error('Unsupported puzzle format version.')
  }
  return data as SerializedPuzzle
}
