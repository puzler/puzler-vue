import { toRaw } from 'vue'
import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'
import { cellKey } from '@/composables/useGrid'
import {
  TYPE_TO_JSON_KEY, JSON_KEY_TO_TYPE, PRESETS_KEY_BY_TYPE, GLOBAL_GROUPS_JSON,
  toolboxCategory, THERMO_TYPES, GLOBAL_VARIANT_EXCLUSIONS, INSTANCE_COLOR_FIELDS,
} from '@/constraints/registry'
import { cosmeticPos, DEFAULT_SHAPE_STYLE, OUTER_RUN_DIRECTIONS } from '@/types/constraints'
import type {
  ThermometerData, ArrowData, KillerCageData, ExtraRegionData, CloneData,
  ConstraintLineData, CosmeticLineData, CosmeticBorderData, TextData, ShapeData, CosmeticCageData,
  ConnectorInstance, OuterClueInstance, ConnectorValue, FogSolverHelpers,
  LinePreset, BorderPreset, ShapePreset, TextPreset, CellColorPreset, CagePreset, ShapeStyle,
  OuterClueType, BorderConnectorType, LittleKillerDirection, RossiniDirection,
} from '@/types/constraints'
import {
  docCell, internalCell, docCells, internalCells, shiftMapKeys, docPos, internalPos,
  docOuterCell, outerLocationFromDoc,
  borderLocationToDocCells, borderLocationFromDocCells,
  cornerLocationToDocCells, cornerLocationFromDocCells,
  thermoEdgesToLines, thermoLinesToEdges,
  regionsToDoc, regionsFromDoc,
} from './puzzleFormat'
import { migratePuzzleDocument } from './puzzleMigrate'

// The export *format* version — the schema of this JSON, not a puzzle's save
// version (v1/v2). Exported as `formatVersion`; bumped when the shape changes.
// 1 → 2: constraint state beyond cosmetics joined the export.
// 2 → 3: solver scratch (solverCellStates) dropped from puzzle data; the
// explicit solution and solve message joined instead.
// 3 → 4: the user-facing document redesign — 1-indexed cell keys, one camelCase
// key per constraint type (presence = active chip), region-first grid.regions,
// UI-grouped globals, instance UUIDs dropped, short preset slugs.
//
// Additive within v4 (absent = old behavior, so no bump): `grid.digits`
// (explicit value range), overlapping `grid.regions` (a cell may appear under
// several labels; on a regioned grid an unlisted cell is VOID dead space),
// `sudokuRules.custom` (keep region/house uniqueness, drop the automatic
// row/column houses), `constraints.houses` (hidden all-different groups), and
// outer-clue cells inside VOID cells (the clue reads every adjacent live run;
// all outer clue lines stop at voids).
export const PUZZLE_EXPORT_VERSION = 4

type EditorStore = ReturnType<typeof useEditorStore>
type GridStore = ReturnType<typeof useGridStore>

// ── The document shape ───────────────────────────────────────────────────────
// Cell keys are 1-indexed (`r1c1` = top-left); the outer clue ring is `r0` /
// `r{rows+1}`. Maps are used only for per-cell values; placed objects are
// arrays. Key presence under globals/constraints/cosmetics = the chip is
// active, even when empty. Keys serialize in registry-canonical order, so the
// same puzzle always produces the same document.

export interface SerializedPreset {
  id: string
  label: string
  // Styled kinds (lines, shapes, texts, cages) carry `style`; cell color
  // presets carry a single `color` (+ optional fill `opacity`).
  style?: Record<string, unknown>
  color?: string
  opacity?: number
}

// Setter-declared rules-text facts for the fog solver, grouped by constraint
// family. Only-true keys serialize; the section is omitted when empty.
export interface SerializedSolverHelpers {
  arrows?: { singleCellBulbs?: boolean; noCrossings?: boolean; oneArrowPerBulb?: boolean }
  killerCages?: { maybeDisconnected?: boolean }
}

export interface SerializedPuzzle {
  formatVersion: number
  // `digits` is the value range (1..N); absent = the grid's long side.
  grid: { rows: number; cols: number; digits?: number; regions?: Record<string, string[]> }
  meta?: { name?: string; author?: string; rules?: string; solveMessage?: string }
  solution?: Record<string, number> | null
  givenDigits?: Record<string, number>
  globals?: Record<string, Record<string, boolean | number[]>>
  constraints?: Record<string, unknown>
  cosmetics?: Record<string, unknown>
  solverHelpers?: SerializedSolverHelpers
}

// ── Store-shaped snapshot ────────────────────────────────────────────────────
// The document builder's input: plain data mirroring the editor/grid stores.
// serializePuzzle fills it from the stores; the v3→v4 migrator fills it from a
// v3 document — both then share buildDocument, so a migrated old file and the
// live serializer can never drift apart.

export interface PuzzleSnapshot {
  rows: number
  cols: number
  // Explicit digit range, or null for the automatic max(rows, cols).
  digits: number | null
  // Per-cell sorted region-label lists (cells may belong to several regions).
  customCellRegions: Record<string, string[]> | null
  meta: { name: string; author: string; rules: string; solveMessage: string }
  solution: Record<string, number> | null
  givenDigits: Record<string, number>
  activeTypes: Set<string>
  variants: Set<string>
  // The Sudoku Rules panel checkbox; lives outside `variants` (whose members
  // all mean "absent = off"). The rule itself rides the chip: key presence in
  // the document means sudoku rules apply, `enabled: false` soft-disables.
  sudokuRulesEnabled: boolean
  customGlobals: Array<{ type: string; value: number }>
  fogSolverHelpers: FogSolverHelpers
  singleCellMarks: Record<string, string[]>
  // Setter colors for single-cell marks (JSON-editor feature): type → internal
  // cell key → color field → hex. Marks without colors simply don't appear.
  singleCellMarkColors: Record<string, Record<string, Record<string, string>>>
  connectorDots: Array<Pick<ConnectorInstance,
    'type' | 'location' | 'value' | 'color' | 'fillColor' | 'outlineColor' | 'textColor'>>
  outerClues: Array<Pick<OuterClueInstance,
    'type' | 'location' | 'value' | 'direction' | 'rossiniDirection' | 'directions' | 'color' | 'textColor' | 'arrowColor'>>
  instances: Array<{ type: string; data: unknown }>
  cellColors: Record<string, string>
  presets: {
    cosmetic_line: LinePreset[]
    cosmetic_border: BorderPreset[]
    shape: ShapePreset[]
    text: TextPreset[]
    cell_color: CellColorPreset[]
    cosmetic_cage: CagePreset[]
  }
}

function snapshotStores(editor: EditorStore, grid: GridStore): PuzzleSnapshot {
  return {
    rows: grid.rows,
    cols: grid.cols,
    digits: grid.digits,
    customCellRegions: grid.customCellRegions,
    meta: {
      name: editor.puzzleName,
      author: editor.puzzleAuthor,
      rules: editor.puzzleRules,
      solveMessage: editor.solveMessage,
    },
    solution: editor.solution,
    givenDigits: editor.givenDigits,
    activeTypes: new Set(editor.activeTypes),
    variants: new Set(editor.activeGlobalVariants),
    sudokuRulesEnabled: editor.sudokuRulesEnabled,
    customGlobals: editor.customGlobalConstraints.map((c) => ({ type: c.type, value: c.value })),
    fogSolverHelpers: { ...editor.fogSolverHelpers },
    singleCellMarks: Object.fromEntries(
      Object.entries(editor.singleCellMarks).map(([type, cells]) => [type, Array.from(cells).sort()]),
    ),
    singleCellMarkColors: toRaw(editor.singleCellMarkColors),
    connectorDots: editor.connectorDots.map((d) => ({
      type: d.type, location: d.location, value: toRaw(d.value),
      color: d.color, fillColor: d.fillColor, outlineColor: d.outlineColor, textColor: d.textColor,
    })),
    outerClues: editor.outerClues.map((c) => ({
      type: c.type, location: c.location, value: c.value,
      direction: c.direction, rossiniDirection: c.rossiniDirection,
      directions: c.directions ? [...c.directions] : undefined,
      color: c.color, textColor: c.textColor, arrowColor: c.arrowColor,
    })),
    instances: editor.cosmeticInstances.map((i) => ({ type: i.type, data: toRaw(i.data) })),
    cellColors: editor.cosmeticCellColors,
    presets: {
      cosmetic_line: editor.linePresets,
      cosmetic_border: editor.borderPresets,
      shape: editor.shapePresets,
      text: editor.textPresets,
      cell_color: editor.cellColorPresets,
      cosmetic_cage: editor.cagePresets,
    },
  }
}

// ── Document builder ─────────────────────────────────────────────────────────

// Preset ids canonicalize to positional slugs on every serialize; the store
// keeps whatever runtime ids it holds, so this stays a pure function of state.
const PRESET_SLUG_PREFIX: Record<keyof PuzzleSnapshot['presets'], string> = {
  cosmetic_line: 'line',
  cosmetic_border: 'border',
  shape: 'shape',
  text: 'text',
  cell_color: 'color',
  cosmetic_cage: 'cage',
}

type SlugMaps = Record<keyof PuzzleSnapshot['presets'], Map<string, string>>

function buildSlugMaps(presets: PuzzleSnapshot['presets']): SlugMaps {
  const out = {} as SlugMaps
  for (const kind of Object.keys(presets) as Array<keyof PuzzleSnapshot['presets']>) {
    out[kind] = new Map(presets[kind].map((p, i) => [p.id, `${PRESET_SLUG_PREFIX[kind]}-${i + 1}`]))
  }
  return out
}

// sizeLinked is editor UX state (width/height inputs mirroring), derived as
// width === height on load — never part of the document.
function docShapeStyle(style: ShapeStyle): Record<string, unknown> {
  const { sizeLinked: _sizeLinked, ...rest } = style
  return rest
}

function docPresets(kind: keyof PuzzleSnapshot['presets'], presets: PuzzleSnapshot['presets'][typeof kind], slugs: SlugMaps): SerializedPreset[] {
  return presets.map((p) => {
    const id = slugs[kind].get(p.id) ?? p.id
    if (kind === 'cell_color') {
      const preset = p as CellColorPreset
      return {
        id,
        label: p.label,
        color: preset.color,
        ...(preset.opacity !== undefined ? { opacity: preset.opacity } : {}),
      }
    }
    const style = (p as unknown as { style: Record<string, unknown> }).style
    return {
      id,
      label: p.label,
      style: kind === 'shape' ? docShapeStyle(style as unknown as ShapeStyle) : { ...style },
    }
  })
}

// The defined subset of an object's per-instance color fields (see
// INSTANCE_COLOR_FIELDS): what the document carries for a colored instance,
// and what hydration copies back. Uncolored instances contribute nothing, so
// documents without setter colors are byte-identical to before.
function pickDefined(obj: object, fields: readonly string[] | undefined): Record<string, unknown> {
  const source = obj as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const field of fields ?? []) {
    if (source[field] !== undefined) out[field] = source[field]
  }
  return out
}

function docConstraintEntry(snap: PuzzleSnapshot, type: string): unknown {
  const category = toolboxCategory(type)
  const colorFields = INSTANCE_COLOR_FIELDS.get(type)
  if (category === 'single_cell') {
    // Plain cell string unless the cell carries setter colors, then the
    // object form { cell, ...colors }.
    const colors = snap.singleCellMarkColors[type] ?? {}
    return (snap.singleCellMarks[type] ?? []).map((cell) => {
      const picked = pickDefined(colors[cell] ?? {}, colorFields)
      return Object.keys(picked).length ? { cell: docCell(cell), ...picked } : docCell(cell)
    })
  }
  if (category === 'connector') {
    return snap.connectorDots.filter((d) => d.type === type).map((d) =>
      type === 'quadruples'
        ? {
            cells: cornerLocationToDocCells(d.location),
            values: Array.isArray(d.value) ? [...d.value] : [],
            ...pickDefined(d, colorFields),
          }
        : {
            cells: borderLocationToDocCells(d.location),
            ...(d.value !== null && !Array.isArray(d.value) ? { value: d.value } : {}),
            ...pickDefined(d, colorFields),
          })
  }
  if (category === 'outer') {
    return snap.outerClues.filter((c) => c.type === type).map((c) => ({
      cell: docOuterCell(c.location),
      ...(c.value !== null ? { value: c.value } : {}),
      // Rossini clues carry an arrow, not a value; the document calls both
      // direction fields `direction` (the type disambiguates).
      ...(type === 'rossini'
        ? { direction: c.rossiniDirection ?? 'increasing' }
        : c.direction ? { direction: c.direction } : {}),
      // Multi-run positions (void-hosted clues): the runs this clue binds.
      // Absent = every readable run.
      ...(c.directions ? { directions: [...c.directions] } : {}),
      ...pickDefined(c, colorFields),
    }))
  }
  // Instance-based constraints (lines, thermos, arrows, cages, regions, clones).
  return snap.instances.filter((i) => i.type === type).map((i) => {
    const colors = pickDefined(i.data as Record<string, unknown>, colorFields)
    if (THERMO_TYPES.has(type)) {
      const data = i.data as ThermometerData
      return { bulb: docCell(data.root), lines: thermoEdgesToLines(data.root, data.edges).map(docCells), ...colors }
    }
    if (type === 'arrow') {
      const data = i.data as ArrowData
      return { bulbCells: docCells(data.bulbCells), arrows: data.arrows.map((p) => docCells(p.cells)), ...colors }
    }
    if (type === 'killer_cage') {
      const data = i.data as KillerCageData
      return { cells: docCells(data.cells), ...(data.sum !== null ? { sum: data.sum } : {}), ...colors }
    }
    if (type === 'extra_regions') {
      return { cells: docCells((i.data as ExtraRegionData).cells), ...colors }
    }
    if (type === 'clone') {
      const data = i.data as CloneData
      return { cells: docCells(data.cells), copies: data.copies.map((c) => ({ ...c })), ...colors }
    }
    return { cells: docCells((i.data as ConstraintLineData).cells), ...colors }
  })
}

function docCosmeticEntry(snap: PuzzleSnapshot, type: string, slugs: SlugMaps): unknown {
  if (type === 'cell_color') {
    return shiftMapKeys(
      Object.fromEntries(Object.entries(snap.cellColors).map(([cell, id]) => [cell, slugs.cell_color.get(id) ?? id])),
      1,
    )
  }
  return snap.instances.filter((i) => i.type === type).map((i) => {
    if (type === 'cosmetic_line') {
      const data = i.data as CosmeticLineData
      return { cells: docCells(data.cells), preset: slugs.cosmetic_line.get(data.presetId) ?? data.presetId }
    }
    if (type === 'cosmetic_border') {
      const data = i.data as CosmeticBorderData
      return {
        edges: data.edges.map(borderLocationToDocCells),
        preset: slugs.cosmetic_border.get(data.presetId) ?? data.presetId,
      }
    }
    if (type === 'cosmetic_cage') {
      const data = i.data as CosmeticCageData
      return {
        cells: docCells(data.cells),
        ...(data.sum !== null ? { sum: data.sum } : {}),
        preset: slugs.cosmetic_cage.get(data.presetId) ?? data.presetId,
      }
    }
    // text / shape: free-positioned, content-carrying
    const data = i.data as TextData & ShapeData
    const kind = type as 'text' | 'shape'
    return {
      pos: docPos(cosmeticPos(data)),
      ...(data.content ? { content: data.content } : {}),
      ...(data.rotation ? { rotation: data.rotation } : {}),
      preset: slugs[kind].get(data.presetId) ?? data.presetId,
    }
  })
}

const LOCAL_CATEGORIES = new Set(['line', 'single_cell', 'connector', 'region', 'outer'])

function typeHasData(snap: PuzzleSnapshot, type: string): boolean {
  const category = toolboxCategory(type)
  if (category === 'single_cell') return (snap.singleCellMarks[type] ?? []).length > 0
  if (category === 'connector') return snap.connectorDots.some((d) => d.type === type)
  if (category === 'outer') return snap.outerClues.some((c) => c.type === type)
  if (category === 'cosmetic') {
    if (type === 'cell_color') return Object.keys(snap.cellColors).length > 0
    return snap.instances.some((i) => i.type === type)
  }
  return snap.instances.some((i) => i.type === type)
}

// The complete v4 document for a snapshot. Sections appear only when they have
// keys; keys appear when their chip is active OR data exists (defensive), and
// an active-but-empty chip survives as an empty entry.
export function buildDocument(snap: PuzzleSnapshot): SerializedPuzzle {
  const slugs = buildSlugMaps(snap.presets)

  const globals: Record<string, Record<string, boolean | number[]>> = {}
  for (const group of GLOBAL_GROUPS_JSON) {
    const entry: Record<string, boolean | number[]> = {}
    for (const variant of group.variants) {
      if (snap.variants.has(variant.type)) entry[variant.key] = true
    }
    for (const [field, customType] of Object.entries(group.customValues)) {
      const values = snap.customGlobals.filter((c) => c.type === customType).map((c) => c.value).sort((a, b) => a - b)
      if (values.length) entry[field] = values
    }
    // Sudoku Rules: the key's PRESENCE means the puzzle has sudoku rules, so
    // a missing chip writes nothing at all; an active chip writes the bare
    // marker, plus `enabled: false` when the panel checkbox soft-disables it
    // (the generic variant loop above never fires for it — its state stays
    // out of snap.variants).
    if (group.type === 'sudoku_rules' && snap.activeTypes.has(group.type) && !snap.sudokuRulesEnabled) {
      entry.enabled = false
    }
    if (snap.activeTypes.has(group.type) || Object.keys(entry).length) globals[group.key] = entry
  }

  const constraints: Record<string, unknown> = {}
  const cosmetics: Record<string, unknown> = {}
  for (const [type, key] of TYPE_TO_JSON_KEY) {
    const category = toolboxCategory(type)
    if (category !== undefined && LOCAL_CATEGORIES.has(category)) {
      if (snap.activeTypes.has(type) || typeHasData(snap, type)) {
        constraints[key] = docConstraintEntry(snap, type)
      }
    } else if (category === 'cosmetic') {
      if (snap.activeTypes.has(type) || typeHasData(snap, type)) {
        cosmetics[key] = docCosmeticEntry(snap, type, slugs)
        const presetsKey = PRESETS_KEY_BY_TYPE.get(type)
        const kind = type as keyof PuzzleSnapshot['presets']
        if (presetsKey) cosmetics[presetsKey] = docPresets(kind, snap.presets[kind], slugs)
      }
    }
  }

  const meta = dropEmpty({ ...snap.meta })
  const regions = regionsToDoc(snap.customCellRegions, snap.rows, snap.cols)
  const solverHelpers = solverHelpersDoc(snap.fogSolverHelpers)
  const doc: SerializedPuzzle = {
    formatVersion: PUZZLE_EXPORT_VERSION,
    grid: {
      rows: snap.rows,
      cols: snap.cols,
      ...(snap.digits !== null ? { digits: snap.digits } : {}),
      ...(regions ? { regions } : {}),
    },
    ...(Object.keys(meta).length ? { meta } : {}),
    ...(snap.solution && Object.keys(snap.solution).length ? { solution: shiftMapKeys(snap.solution, 1) } : {}),
    ...(Object.keys(snap.givenDigits).length ? { givenDigits: shiftMapKeys(snap.givenDigits, 1) } : {}),
    ...(Object.keys(globals).length ? { globals } : {}),
    ...(Object.keys(constraints).length ? { constraints } : {}),
    ...(Object.keys(cosmetics).length ? { cosmetics } : {}),
    ...(solverHelpers ? { solverHelpers } : {}),
  }
  return doc
}

// Only-true keys, grouped by constraint family; null when nothing is declared.
function solverHelpersDoc(h: FogSolverHelpers): SerializedSolverHelpers | null {
  const arrows = {
    ...(h.arrowSingleCellBulbs ? { singleCellBulbs: true } : {}),
    ...(h.arrowNoCrossings ? { noCrossings: true } : {}),
    ...(h.arrowOneArrowPerBulb ? { oneArrowPerBulb: true } : {}),
  }
  const killerCages = h.cagesMaybeDisconnected ? { maybeDisconnected: true } : {}
  const doc: SerializedSolverHelpers = {
    ...(Object.keys(arrows).length ? { arrows } : {}),
    ...(Object.keys(killerCages).length ? { killerCages } : {}),
  }
  return Object.keys(doc).length ? doc : null
}

function dropEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''))
}

// The export/import shape — clean, with the solution and solve message.
export function serializePuzzle(editor: EditorStore, grid: GridStore): SerializedPuzzle {
  return buildDocument(snapshotStores(editor, grid))
}

// The play-safe definition stored on a version: same shape, but the solution
// and solve message are stripped (they live in their own version columns and
// must never reach a solver).
export function serializePlayDefinition(editor: EditorStore, grid: GridStore): SerializedPuzzle {
  const snap = snapshotStores(editor, grid)
  return buildDocument({ ...snap, solution: null, meta: { ...snap.meta, solveMessage: '' } })
}

// ── Hydration ────────────────────────────────────────────────────────────────

// Inverse of serializePuzzle: hydrates the editor and grid stores from a stored
// definition. reset() first gives a clean slate and clears undo history, so
// loading a version is not itself an undoable step.
export function deserializePuzzle(editor: EditorStore, grid: GridStore, input: SerializedPuzzle) {
  editor.reset()
  hydratePuzzle(editor, grid, input)
}

interface DocConnector {
  cells?: string[]
  value?: ConnectorValue
  values?: number[]
  color?: string
  fillColor?: string
  outlineColor?: string
  textColor?: string
}
interface DocOuterClue {
  cell?: string
  value?: number
  direction?: string
  directions?: string[]
  color?: string
  textColor?: string
  arrowColor?: string
}
// A single-cell mark entry: the plain cell string, or the object form when
// the mark carries setter colors.
interface DocSingleCellMark {
  cell?: string
  color?: string
  backgroundColor?: string
  chevronColor?: string
  fillColor?: string
  outlineColor?: string
}
interface DocInstance {
  cells?: string[]
  // Cosmetic borders: each edge is the pair of 1-indexed cells it separates.
  edges?: string[][]
  sum?: number
  copies?: Array<{ dRow: number; dCol: number }>
  bulb?: string
  lines?: string[][]
  bulbCells?: string[]
  arrows?: string[][]
  pos?: { x: number; y: number }
  content?: string
  rotation?: number
  preset?: string
  // Per-instance setter colors (the union across families; INSTANCE_COLOR_FIELDS
  // says which apply per type).
  color?: string
  lineColor?: string
  bulbFillColor?: string
  bulbOutlineColor?: string
  bulbStrokeColor?: string
  bulbColor?: string
  arrowColor?: string
  cageColor?: string
  textColor?: string
}

// The hydration half of deserializePuzzle, without the reset. Callers that need
// an undoable state swap (the raw JSON editor) pair this with resetPuzzleState()
// so the undo history survives; everything else goes through deserializePuzzle.
// Assumes the stores are freshly reset — sections absent from the input keep
// whatever reset() left behind (empty maps, default presets). Pre-v4 documents
// (stored versions from before the backfill, saved export files) are migrated
// up front, so everything below reads v4 only.
export function hydratePuzzle(editor: EditorStore, grid: GridStore, input: SerializedPuzzle) {
  // The import modal holds the parsed JSON in a ref, so Vue hands us a reactive
  // proxy; unwrap before cloning anything (structuredClone throws on proxies).
  const data = migratePuzzleDocument(toRaw(input))

  const meta = data.meta ?? {}
  const globals = data.globals ?? {}
  const constraints = (data.constraints ?? {}) as Record<string, unknown>
  const cosmetics = (data.cosmetics ?? {}) as Record<string, unknown>

  grid.setDimensions(data.grid.rows, data.grid.cols)
  grid.setDigits(data.grid.digits ?? null)
  grid.setCustomCellRegions(
    data.grid.regions ? regionsFromDoc(data.grid.regions, data.grid.rows, data.grid.cols) : null,
  )

  editor.puzzleName = meta.name ?? ''
  editor.puzzleAuthor = meta.author ?? ''
  editor.puzzleRules = meta.rules ?? ''
  editor.solveMessage = meta.solveMessage ?? ''
  editor.solution = data.solution ? shiftMapKeys(data.solution, -1) : null
  editor.givenDigits = shiftMapKeys(data.givenDigits ?? {}, -1)

  // Key presence = active chip. Unknown keys are dropped here — the JSON
  // editor's validation warns about them before this runs.
  const activeTypes = new Set<string>()
  const addActive = (key: string) => {
    const type = JSON_KEY_TO_TYPE.get(key)
    if (type) activeTypes.add(type)
  }
  Object.keys(constraints).forEach(addActive)
  // Presets keys are siblings, not kinds — only kind keys map to types.
  Object.keys(cosmetics).filter((k) => JSON_KEY_TO_TYPE.has(k)).forEach(addActive)

  // Globals: group keys activate chips; toggles map to variant types; custom
  // value arrays expand to CustomGlobalConstraint entries.
  const variants = new Set<string>()
  const customs: Array<{ id: string; type: 'anti_diff' | 'anti_ratio' | 'anti_sum'; value: number }> = []
  for (const group of GLOBAL_GROUPS_JSON) {
    const entry = globals[group.key]
    if (entry === undefined) continue
    activeTypes.add(group.type)
    for (const variant of group.variants) {
      // Sudoku Rules' `enabled` self-toggle is default-ON state with a
      // dedicated ref; it must not leak into the variants set (absence means
      // off there). Real variants of the group (custom houses) hydrate
      // normally.
      if (variant.type === 'sudoku_rules') continue
      if (entry[variant.key] !== true) continue
      // Hand-edited documents can enable both of a mutually exclusive pair;
      // mirror the UI toggle: the later one wins, dropping its partner.
      const excluded = GLOBAL_VARIANT_EXCLUSIONS[variant.type]
      if (excluded) variants.delete(excluded)
      variants.add(variant.type)
    }
    for (const [field, customType] of Object.entries(group.customValues)) {
      const values = entry[field]
      if (!Array.isArray(values)) continue
      for (const value of values) {
        customs.push({ id: crypto.randomUUID(), type: customType as 'anti_diff' | 'anti_ratio' | 'anti_sum', value })
      }
    }
  }
  editor.activeTypes = activeTypes
  editor.activeGlobalVariants = variants
  // The checkbox state: an absent field means checked. Whether the rules
  // APPLY also needs the chip, which key presence restored above (an absent
  // sudokuRules key = a rules-off puzzle).
  editor.sudokuRulesEnabled = globals.sudokuRules?.enabled !== false
  editor.customGlobalConstraints = customs

  const helperDoc = data.solverHelpers ?? {}
  editor.fogSolverHelpers = {
    ...(helperDoc.arrows?.singleCellBulbs ? { arrowSingleCellBulbs: true } : {}),
    ...(helperDoc.arrows?.noCrossings ? { arrowNoCrossings: true } : {}),
    ...(helperDoc.arrows?.oneArrowPerBulb ? { arrowOneArrowPerBulb: true } : {}),
    ...(helperDoc.killerCages?.maybeDisconnected ? { cagesMaybeDisconnected: true } : {}),
  }

  // Constraint entries route by category; instance ids are regenerated.
  const singleCellMarks: Record<string, Set<string>> = {}
  const singleCellMarkColors: Record<string, Record<string, Record<string, string>>> = {}
  const connectorDots: ConnectorInstance[] = []
  const outerClues: OuterClueInstance[] = []
  const instances: Array<{ id: string; type: string; data: unknown }> = []

  for (const [key, entry] of Object.entries(constraints)) {
    const type = JSON_KEY_TO_TYPE.get(key)
    if (!type) continue
    const category = toolboxCategory(type)
    const colorFields = INSTANCE_COLOR_FIELDS.get(type)
    if (category === 'single_cell') {
      const cells = new Set<string>()
      const colors: Record<string, Record<string, string>> = {}
      for (const item of (entry as Array<string | DocSingleCellMark>) ?? []) {
        if (typeof item === 'string') {
          cells.add(internalCell(item))
          continue
        }
        const cell = internalCell(item.cell ?? '')
        cells.add(cell)
        const picked = pickDefined(item as Record<string, unknown>, colorFields)
        if (Object.keys(picked).length) colors[cell] = picked as Record<string, string>
      }
      singleCellMarks[type] = cells
      if (Object.keys(colors).length) singleCellMarkColors[type] = colors
    } else if (category === 'connector') {
      for (const dot of (entry as DocConnector[]) ?? []) {
        connectorDots.push({
          id: crypto.randomUUID(),
          type: type as BorderConnectorType,
          location: type === 'quadruples'
            ? cornerLocationFromDocCells(dot.cells ?? [])
            : borderLocationFromDocCells(dot.cells ?? []),
          value: type === 'quadruples' ? [...(dot.values ?? [])] : (dot.value ?? null),
          ...pickDefined(dot, colorFields),
        })
      }
    } else if (category === 'outer') {
      for (const clue of (entry as DocOuterClue[]) ?? []) {
        const directions = Array.isArray(clue.directions)
          ? OUTER_RUN_DIRECTIONS.filter((d) => (clue.directions as string[]).includes(d))
          : null
        outerClues.push({
          id: crypto.randomUUID(),
          type: type as OuterClueType,
          location: outerLocationFromDoc(clue.cell ?? ''),
          value: clue.value ?? null,
          ...(type === 'rossini'
            ? { rossiniDirection: (clue.direction as RossiniDirection) ?? 'increasing' }
            : clue.direction ? { direction: clue.direction as LittleKillerDirection } : {}),
          ...(directions && directions.length ? { directions } : {}),
          ...pickDefined(clue, colorFields),
        })
      }
    } else {
      for (const inst of (entry as DocInstance[]) ?? []) {
        instances.push({
          id: crypto.randomUUID(),
          type,
          data: {
            ...(instanceDataFromDoc(type, inst) as Record<string, unknown>),
            ...pickDefined(inst, colorFields),
          },
        })
      }
    }
  }

  // Cosmetic kinds: instances + presets (slug ids serve as runtime ids until
  // the next placement generates fresh ones).
  const cellColorsEntry = cosmetics.cellColors as Record<string, string> | undefined
  editor.cosmeticCellColors = cellColorsEntry ? shiftMapKeys(cellColorsEntry, -1) : {}
  for (const kind of ['cosmetic_line', 'cosmetic_border', 'shape', 'text', 'cosmetic_cage'] as const) {
    const key = TYPE_TO_JSON_KEY.get(kind)!
    for (const inst of (cosmetics[key] as DocInstance[] | undefined) ?? []) {
      instances.push({ id: crypto.randomUUID(), type: kind, data: cosmeticDataFromDoc(kind, inst) })
    }
  }

  editor.singleCellMarks = singleCellMarks
  editor.singleCellMarkColors = singleCellMarkColors
  editor.connectorDots = connectorDots
  editor.outerClues = outerClues
  editor.cosmeticInstances = instances

  // Presets are only overwritten when present, so a document that omits them
  // keeps the default preset reset() created (the line/shape tools need one).
  const linePresets = cosmetics.linePresets as LinePreset[] | undefined
  const borderPresets = cosmetics.borderPresets as BorderPreset[] | undefined
  const shapePresets = cosmetics.shapePresets as Array<{ id: string; label: string; style: Omit<ShapeStyle, 'sizeLinked'> }> | undefined
  const textPresets = cosmetics.textPresets as TextPreset[] | undefined
  const cellColorPresets = cosmetics.cellColorPresets as CellColorPreset[] | undefined
  const cagePresets = cosmetics.cagePresets as CagePreset[] | undefined
  if (linePresets) editor.linePresets = structuredClone(linePresets)
  if (borderPresets) editor.borderPresets = structuredClone(borderPresets)
  if (shapePresets) {
    editor.shapePresets = shapePresets.map((p) => ({
      ...p,
      style: {
        ...DEFAULT_SHAPE_STYLE,
        ...structuredClone(p.style),
        sizeLinked: p.style.width === p.style.height,
      },
    }))
  }
  if (textPresets) editor.textPresets = structuredClone(textPresets)
  if (cellColorPresets) editor.cellColorPresets = structuredClone(cellColorPresets)
  if (cagePresets) editor.cagePresets = structuredClone(cagePresets)

  // Point the active-preset selectors at the restored presets (reset() left
  // them on freshly-generated default ids).
  if (linePresets?.[0]) editor.activeLinePresetId = linePresets[0].id
  if (borderPresets?.[0]) editor.activeBorderPresetId = borderPresets[0].id
  if (shapePresets?.[0]) editor.activeShapePresetId = shapePresets[0].id
  if (textPresets?.[0]) editor.activeTextPresetId = textPresets[0].id
  if (cellColorPresets?.[0]) editor.activeCellColorPresetId = cellColorPresets[0].id
  if (cagePresets?.[0]) editor.activeCagePresetId = cagePresets[0].id
}

function instanceDataFromDoc(type: string, inst: DocInstance): unknown {
  if (THERMO_TYPES.has(type)) {
    const lines = (inst.lines ?? []).map(internalCells)
    return { root: internalCell(inst.bulb ?? ''), edges: thermoLinesToEdges(lines) } satisfies ThermometerData
  }
  if (type === 'arrow') {
    return {
      bulbCells: internalCells(inst.bulbCells ?? []),
      arrows: (inst.arrows ?? []).map((cells) => ({ cells: internalCells(cells) })),
    } satisfies ArrowData
  }
  if (type === 'killer_cage') {
    return { cells: internalCells(inst.cells ?? []), sum: inst.sum ?? null } satisfies KillerCageData
  }
  if (type === 'extra_regions') {
    return { cells: internalCells(inst.cells ?? []) } satisfies ExtraRegionData
  }
  if (type === 'clone') {
    return { cells: internalCells(inst.cells ?? []), copies: [...(inst.copies ?? [])] } satisfies CloneData
  }
  return { cells: internalCells(inst.cells ?? []) } satisfies ConstraintLineData
}

function cosmeticDataFromDoc(kind: string, inst: DocInstance): unknown {
  if (kind === 'cosmetic_line') {
    return { cells: internalCells(inst.cells ?? []), presetId: inst.preset ?? '' } satisfies CosmeticLineData
  }
  if (kind === 'cosmetic_border') {
    return {
      edges: (inst.edges ?? []).map(borderLocationFromDocCells),
      presetId: inst.preset ?? '',
    } satisfies CosmeticBorderData
  }
  if (kind === 'cosmetic_cage') {
    return { cells: internalCells(inst.cells ?? []), sum: inst.sum ?? null, presetId: inst.preset ?? '' } satisfies CosmeticCageData
  }
  return {
    pos: internalPos(inst.pos ?? { x: 1.5, y: 1.5 }),
    content: inst.content ?? '',
    ...(inst.rotation ? { rotation: inst.rotation } : {}),
    presetId: inst.preset ?? '',
  }
}

// The map of currently-filled cells (givens plus solver-entered values), empty
// cells omitted. Used both to capture the author's solution and to check a
// player's board against the solution hash — so variants that intentionally
// leave cells blank work: the solution simply doesn't include those cells.
// Letter-tool letters ride through like any wrong digit: they hash and submit
// as-is, and can never match a numeric solution.
export function boardSnapshot(editor: EditorStore, grid: GridStore): Record<string, number | string> {
  const board: Record<string, number | string> = {}
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
// the import UI. Tolerates older export versions (hydrate migrates them).
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
