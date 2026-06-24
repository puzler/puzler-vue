// EXPORT IS THEME-AGNOSTIC. User themes are a view-only preference and must NEVER leak into an
// export: do not import useConstraintStyles / the theme store / appearance tokens here. Export
// styling comes only from the f-puzzles color maps below and the editor's cosmetic presets
// (author data). Keeping this boundary means a shared puzzle looks the same for every solver.
import { compressToBase64 } from 'lz-string'
import { keyToRowCol } from '@/composables/useGrid'
import {
  borderKeyCells,
  cornerKeyToRowCol,
  parseOuterKey,
  cosmeticPos,
} from '@/types/constraints'
import type {
  ThermometerData,
  ArrowData,
  KillerCageData,
  ExtraRegionData,
  CloneData,
  ConstraintLineData,
  CosmeticLineData,
  CosmeticCageData,
  CosmeticPos,
  ShapeData,
  TextData,
  ConnectorDot,
  OuterClue,
  LinePreset,
  ShapePreset,
  TextPreset,
  CagePreset,
  CellColorPreset,
} from '@/types/constraints'
import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'

type EditorStore = ReturnType<typeof useEditorStore>
type GridStore = ReturnType<typeof useGridStore>

// SudokuPad imports puzzles by URL. The `fpuzzles` prefix expects the f-puzzles
// JSON, LZString-compressed to base64 — exactly what f-puzzles' own "export"
// produces. We build that JSON from Puzler's model and hand SudokuPad the same
// payload, so it renders constraints natively (with solve-checking) rather than
// as inert cosmetics.
const SUDOKUPAD_BASE = 'https://sudokupad.app/'

// f-puzzles colours are 8-digit hex (#RRGGBBAA); a fill of 'none' becomes fully
// transparent. Puzler stores plain #RRGGBB, which f-puzzles also accepts.
const TRANSPARENT = '#00000000'
function fpColor(color: string): string {
  return color === 'none' ? TRANSPARENT : color
}

// SudokuPad's importer has no indexer constraint, so index cells are shown as a
// background highlight (cell `c`) instead — the same way Puzler renders them.
// These are Puzler's CELL_BACKGROUND_COLORS flattened onto white (the tints are
// drawn at 0.7 opacity in the editor); the solution check enforces the logic.
const INDEX_CELL_COLOR = {
  row: '#FFD9D9',  // light red
  col: '#CBF1D5',  // light green
  both: '#FFF8C4', // light yellow (a cell that indexes both)
}
const INDEXER_FIELD: Record<string, string> = {
  row_index_cells: 'rowindexer',
  col_index_cells: 'columnindexer',
}

// Puzler cell key (r{row}c{col}, 0-indexed) → f-puzzles label (R{n}C{n}, 1-indexed).
function fpCell(key: string): string {
  const { row, col } = keyToRowCol(key)
  return `R${row + 1}C${col + 1}`
}

// f-puzzles places cosmetics on a continuous grid where a cell centre is an
// integer coordinate and edges/corners fall on half-integers. Our `pos` is in
// cell units (centre = row+0.5/col+0.5), so the f-puzzles label is pos+0.5;
// values outside [0.5, size+0.5] address the space outside the grid.
function fpPos(pos: CosmeticPos): string {
  return `R${pos.y + 0.5}C${pos.x + 0.5}`
}

// An outer-clue ring position → f-puzzles label. The ring uses row/col -1 (top
// or left of the grid) and rows/cols (bottom or right); f-puzzles addresses
// those with index 0 and size+1 respectively.
function fpOuterCell(row: number, col: number, rows: number, cols: number): string {
  const r = row < 0 ? 0 : row >= rows ? rows + 1 : row + 1
  const c = col < 0 ? 0 : col >= cols ? cols + 1 : col + 1
  return `R${r}C${c}`
}

const LITTLE_KILLER_DIR: Record<string, string> = {
  'up-left': 'UL',
  'up-right': 'UR',
  'down-left': 'DL',
  'down-right': 'DR',
}

// A thermometer is stored as an edge-tree rooted at the bulb. f-puzzles draws a
// thermometer as one or more straight lines that share the bulb, so we flatten
// the tree into every root-to-leaf path.
function thermoLines(data: ThermometerData): string[][] {
  const adj = new Map<string, string[]>()
  for (const edge of data.edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, [])
    adj.get(edge.from)!.push(edge.to)
  }
  const paths: string[][] = []
  const walk = (cell: string, path: string[]) => {
    const nexts = adj.get(cell) ?? []
    if (nexts.length === 0) {
      paths.push(path)
      return
    }
    for (const next of nexts) walk(next, [...path, next])
  }
  walk(data.root, [data.root])
  return paths.map((p) => p.map(fpCell))
}

// The cells along a main diagonal, used to draw anti-diagonal constraints (which
// SudokuPad can't enforce) as a cosmetic line. Positive runs bottom-left to
// top-right; negative runs top-left to bottom-right.
function diagonalCells(kind: 'positive' | 'negative', size: number): string[] {
  const cells: string[] = []
  for (let i = 0; i < size; i++) {
    const row = kind === 'positive' ? size - 1 - i : i
    cells.push(`r${row}c${i}`)
  }
  return cells
}

// f-puzzles names German Whispers "whispers"; the rest line up by name. Dutch
// whispers/lockout have no f-puzzles equivalent — handled as warnings.
const CONSTRAINT_LINE_FIELD: Record<string, string> = {
  renban: 'renban',
  german_whispers: 'whispers',
  palindrome: 'palindrome',
  region_sum: 'regionsumline',
  between_lines: 'betweenline',
}

// SudokuPad's f-puzzles importer renders some line constraints natively
// (palindrome, between lines) but has no parser for others — it silently drops
// renban, whispers, and region-sum lines. f-puzzles' own SudokuPad export works
// around this by also emitting a cosmetic line in the constraint's canonical
// colour, so we do the same. SudokuPad checks the solve against the embedded
// solution rather than by enforcing constraints, so the line plus the solution
// gives a fully playable, checkable puzzle. Colours/widths match f-puzzles.
const UNRENDERED_LINE_COSMETIC: Record<string, { outlineC: string; width: number }> = {
  renban: { outlineC: '#F067F0', width: 0.4 },
  german_whispers: { outlineC: '#67F067', width: 0.3 },
  region_sum: { outlineC: '#2ECBFF', width: 0.25 },
}

// Likewise SudokuPad's importer has no parser for X-Sums or Skyscrapers, so we
// render those outer clues as a text overlay in the outer cell.
const OUTER_UNRENDERED = new Set(['x_sums', 'skyscrapers'])

export interface SudokuPadExport {
  url: string
  // Human-readable notes about anything that couldn't be represented in
  // f-puzzles, so the setter knows what to re-create by hand in SudokuPad.
  warnings: string[]
}

export interface SudokuPadExportOptions {
  // Used as the author when the puzzle's author field is left blank — the
  // editor shows the signed-in user's display name as the placeholder, so the
  // export honours that same default.
  fallbackAuthor?: string
}

// Builds the f-puzzles object (and any warnings) for the current puzzle. Kept
// separate from URL building so it can be unit-tested directly.
export function puzzleToFpuzzles(
  editor: EditorStore,
  grid: GridStore,
  options: SudokuPadExportOptions = {},
): { data: Record<string, unknown>; warnings: string[] } {
  const warnings: string[] = []
  const { rows, cols } = grid

  if (rows !== cols) {
    throw new Error('SudokuPad export needs a square grid; this puzzle is not square.')
  }
  const size = rows

  const push = <T>(obj: Record<string, unknown>, field: string, entry: T) => {
    if (!obj[field]) obj[field] = []
    ;(obj[field] as T[]).push(entry)
  }

  const fp: Record<string, unknown> = { size }
  if (editor.puzzleName) fp.title = editor.puzzleName
  const author = editor.puzzleAuthor || options.fallbackAuthor
  if (author) fp.author = author
  if (editor.puzzleRules) fp.ruleset = editor.puzzleRules

  // ── Grid: givens, regions, highlight colours ────────────────────────────────
  const colorById = new Map<string, string>(
    (editor.cellColorPresets as CellColorPreset[]).map((p) => [p.id, p.color]),
  )
  // Only emit explicit regions when the puzzle overrides the defaults — for a
  // standard square grid f-puzzles assigns the boxes itself.
  let labelToRegion: Map<string, number> | null = null
  if (grid.customCellRegions) {
    const labels = new Set<string>()
    grid.cellRegionLabelMap.forEach((label) => { if (label !== null) labels.add(label) })
    labelToRegion = new Map([...labels].sort().map((label, i) => [label, i]))
  }

  const rowIndexCells = new Set(editor.singleCellMarks['row_index_cells'] ?? [])
  const colIndexCells = new Set(editor.singleCellMarks['col_index_cells'] ?? [])

  const gridCells: Record<string, unknown>[][] = []
  let hasNullRegion = false
  for (let r = 0; r < size; r++) {
    const rowCells: Record<string, unknown>[] = []
    for (let c = 0; c < size; c++) {
      const key = `r${r}c${c}`
      const cell: Record<string, unknown> = {}
      const given = editor.givenDigits[key]
      if (given !== undefined) {
        cell.value = given
        cell.given = true
      }
      if (labelToRegion) {
        const label = grid.cellRegionLabelMap.get(key) ?? null
        if (label !== null && labelToRegion.has(label)) cell.region = labelToRegion.get(label)
        else hasNullRegion = true
      }
      // An author-applied cosmetic colour wins; otherwise tint index cells.
      const colorId = editor.cosmeticCellColors[key]
      if (colorId && colorById.has(colorId)) {
        cell.c = colorById.get(colorId)
      } else {
        const isRow = rowIndexCells.has(key)
        const isCol = colIndexCells.has(key)
        if (isRow && isCol) cell.c = INDEX_CELL_COLOR.both
        else if (isRow) cell.c = INDEX_CELL_COLOR.row
        else if (isCol) cell.c = INDEX_CELL_COLOR.col
      }
      rowCells.push(cell)
    }
    gridCells.push(rowCells)
  }
  fp.grid = gridCells
  if (hasNullRegion) warnings.push('Some cells belong to no region; SudokuPad may assign them a default box.')

  // ── Solution (enables SudokuPad solve-checking) ─────────────────────────────
  if (editor.solution && Object.keys(editor.solution).length > 0) {
    const sol: string[] = new Array(size * size).fill('')
    for (const [key, digit] of Object.entries(editor.solution)) {
      const { row, col } = keyToRowCol(key)
      if (row < size && col < size) sol[row * size + col] = String(digit)
    }
    fp.solution = sol
  }

  // ── Global variants ─────────────────────────────────────────────────────────
  const variants = editor.activeGlobalVariants
  const negative = new Set<string>()
  if (variants.has('positive_diagonal')) fp['diagonal+'] = true
  if (variants.has('negative_diagonal')) fp['diagonal-'] = true
  if (variants.has('kings_move')) fp.antiking = true
  if (variants.has('knights_move')) fp.antiknight = true
  if (variants.has('nonconsecutive')) fp.nonconsecutive = true
  if (variants.has('disjoint_sets')) fp.disjointgroups = true
  if (variants.has('anti_black_kropki')) negative.add('ratio')
  if (variants.has('anti_x') || variants.has('anti_v')) negative.add('xv')
  // SudokuPad has no anti-diagonal constraint, so draw the diagonal as a
  // cosmetic line marking where the rule applies. The solution check validates
  // the actual digits.
  for (const kind of ['positive', 'negative'] as const) {
    if (!variants.has(`anti_${kind}_diagonal`)) continue
    push(fp, 'line', {
      lines: [diagonalCells(kind, size).map(fpCell)],
      outlineC: '#f06292', width: 0.05, isNewConstraint: true,
    })
  }

  // Custom anti-constraints map to f-puzzles "negative" only at the default
  // value (difference 1, ratio 2); any other value can't be expressed.
  for (const cg of editor.customGlobalConstraints) {
    if (cg.type === 'anti_diff' && cg.value === 1) negative.add('difference')
    else if (cg.type === 'anti_ratio' && cg.value === 2) negative.add('ratio')
    else warnings.push(`Custom "${cg.type}" (value ${cg.value}) has no SudokuPad equivalent and was dropped.`)
  }
  if (negative.size > 0) fp.negative = [...negative]

  // ── Single-cell marks ───────────────────────────────────────────────────────
  const SINGLE_FIELD: Record<string, string> = {
    odd_cells: 'odd',
    even_cells: 'even',
    minimums: 'minimum',
    maximums: 'maximum',
  }
  for (const [type, field] of Object.entries(SINGLE_FIELD)) {
    const cells = editor.singleCellMarks[type]
    if (!cells) continue
    for (const key of cells) push(fp, field, { cell: fpCell(key) })
  }

  // Index cells render as the background tint set on the grid above; also emit
  // the logical indexer field so the puzzle round-trips back to f-puzzles
  // (SudokuPad's importer ignores it).
  for (const [type, field] of Object.entries(INDEXER_FIELD)) {
    const cells = editor.singleCellMarks[type]
    if (cells && cells.size > 0) push(fp, field, { cells: [...cells].map(fpCell) })
  }

  // ── Connector dots (difference / ratio / XV / quadruples) ───────────────────
  for (const [borderKey, dot] of Object.entries(editor.connectorDots as Record<string, ConnectorDot>)) {
    if (dot.type === 'quadruples') {
      const corner = cornerKeyToRowCol(borderKey)
      if (!corner) continue
      const { row, col } = corner // intersection indices (1-based interior)
      const cells = [
        `r${row - 1}c${col - 1}`, `r${row - 1}c${col}`,
        `r${row}c${col - 1}`, `r${row}c${col}`,
      ].map(fpCell)
      push(fp, 'quadruple', { cells, values: Array.isArray(dot.value) ? dot.value : [] })
      continue
    }
    const [a, b] = borderKeyCells(borderKey)
    const cells = [fpCell(a), fpCell(b)]
    if (dot.type === 'difference_dots') {
      push(fp, 'difference', { cells, value: dot.value == null ? '' : String(dot.value) })
    } else if (dot.type === 'ratio_dots') {
      push(fp, 'ratio', { cells, value: dot.value == null ? '' : String(dot.value) })
    } else if (dot.type === 'xv') {
      if (dot.value === 'X' || dot.value === 'V') push(fp, 'xv', { cells, value: dot.value })
      else warnings.push('An XV marker with no X/V letter was dropped.')
    }
  }

  // ── Outer clues ─────────────────────────────────────────────────────────────
  const OUTER_FIELD: Record<string, string> = {
    x_sums: 'xsum',
    sandwich_sums: 'sandwichsum',
    skyscrapers: 'skyscraper',
  }
  for (const [key, clue] of Object.entries(editor.outerClues as Record<string, OuterClue>)) {
    const pos = parseOuterKey(key)
    if (!pos) continue
    const cell = fpOuterCell(pos.row, pos.col, size, size)
    const value = clue.value == null ? '' : String(clue.value)
    if (clue.type === 'little_killers') {
      const dir = clue.direction ? LITTLE_KILLER_DIR[clue.direction] : undefined
      if (dir) push(fp, 'littlekillersum', { cell, direction: dir, value })
      else warnings.push('A little killer with no direction was dropped.')
    } else if (OUTER_FIELD[clue.type]) {
      push(fp, OUTER_FIELD[clue.type], { cell, value })
      // X-Sums and Skyscrapers aren't parsed by SudokuPad's importer, so also
      // place the clue as text in the outer cell.
      if (OUTER_UNRENDERED.has(clue.type) && value) {
        push(fp, 'text', { cells: [cell], value, fontC: '#000000', size: 0.7 })
      }
    }
  }

  // ── Instance-backed constraints (lines, thermos, arrows, cages, regions) ────
  for (const inst of editor.cosmeticInstances) {
    switch (inst.type) {
      case 'thermometer':
        push(fp, 'thermometer', { lines: thermoLines(inst.data as ThermometerData) })
        break
      case 'arrow': {
        const data = inst.data as ArrowData
        push(fp, 'arrow', {
          lines: data.arrows.map((path) => path.cells.map(fpCell)),
          cells: data.bulbCells.map(fpCell),
        })
        break
      }
      case 'killer_cage': {
        const data = inst.data as KillerCageData
        push(fp, 'killercage', { cells: data.cells.map(fpCell), value: data.sum == null ? '' : String(data.sum) })
        break
      }
      case 'extra_regions':
        push(fp, 'extraregion', { cells: (inst.data as ExtraRegionData).cells.map(fpCell) })
        break
      case 'clone': {
        const data = inst.data as CloneData
        for (const copy of data.copies) {
          const cloneCells = data.cells.map((c) => {
            const { row, col } = keyToRowCol(c)
            return fpCell(`r${row + copy.dRow}c${col + copy.dCol}`)
          })
          push(fp, 'clone', { cells: data.cells.map(fpCell), cloneCells })
        }
        break
      }
      case 'dutch_whispers':
        // No f-puzzles constraint exists; render the canonical orange line.
        push(fp, 'line', {
          lines: [(inst.data as ConstraintLineData).cells.map(fpCell)],
          outlineC: '#FF9A00', width: 0.3, isNewConstraint: true,
        })
        break
      case 'cosmetic_line': {
        const data = inst.data as CosmeticLineData
        const preset = (editor.linePresets as LinePreset[]).find((p) => p.id === data.presetId)
        push(fp, 'line', {
          lines: [data.cells.map(fpCell)],
          outlineC: preset?.style.color ?? '#777777',
          width: (preset?.style.strokeWidth ?? 8) / 64,
        })
        break
      }
      case 'cosmetic_cage': {
        const data = inst.data as CosmeticCageData
        const preset = (editor.cagePresets as CagePreset[]).find((p) => p.id === data.presetId)
        push(fp, 'cage', {
          cells: data.cells.map(fpCell),
          value: data.sum == null ? '' : String(data.sum),
          outlineC: preset?.style.cageColor ?? '#777777',
          fontC: preset?.style.textColor ?? '#777777',
        })
        break
      }
      case 'shape': {
        const data = inst.data as ShapeData
        const preset = (editor.shapePresets as ShapePreset[]).find((p) => p.id === data.presetId)
        const style = preset?.style
        // f-puzzles has no diamond, but a square rotated 45° is the same shape.
        const isDiamond = style?.shapeType === 'diamond'
        const field = style?.shapeType === 'circle' ? 'circle' : 'rectangle'
        const diameter = style?.size ?? 0.5
        const entry: Record<string, unknown> = {
          cells: [fpPos(cosmeticPos(data))],
          baseC: fpColor(style?.fillColor ?? 'none'),
          outlineC: style?.strokeColor ?? '#333333',
          fontC: style?.textColor ?? '#000000',
          width: diameter, height: diameter,
          value: data.content ?? '',
        }
        // A diamond is a square rotated 45°, on top of any per-object rotation.
        const shapeAngle = (((isDiamond ? 45 : 0) + (data.rotation ?? 0)) % 360 + 360) % 360
        if (shapeAngle) entry.angle = shapeAngle
        push(fp, field, entry)
        break
      }
      case 'text': {
        const data = inst.data as TextData
        const preset = (editor.textPresets as TextPreset[]).find((p) => p.id === data.presetId)
        const entry: Record<string, unknown> = {
          cells: [fpPos(cosmeticPos(data))],
          value: data.content ?? '',
          fontC: preset?.style.color ?? '#333333',
          size: (preset?.style.fontSize ?? 20) / 50,
        }
        if (data.rotation) entry.angle = ((data.rotation % 360) + 360) % 360
        push(fp, 'text', entry)
        break
      }
      default: {
        // Constraint lines that map directly by name.
        const field = CONSTRAINT_LINE_FIELD[inst.type]
        if (field) {
          const lineCells = (inst.data as ConstraintLineData).cells.map(fpCell)
          push(fp, field, { lines: [lineCells] })
          // For the ones SudokuPad's importer drops, add a cosmetic line so the
          // constraint still shows (see UNRENDERED_LINE_COSMETIC).
          const cosmetic = UNRENDERED_LINE_COSMETIC[inst.type]
          if (cosmetic) push(fp, 'line', { lines: [lineCells], ...cosmetic, isNewConstraint: true })
        }
      }
    }
  }

  return { data: fp, warnings }
}

// Compresses the f-puzzles JSON the way SudokuPad expects and returns a loadable
// URL plus any fidelity warnings.
export function exportToSudokuPad(
  editor: EditorStore,
  grid: GridStore,
  options: SudokuPadExportOptions = {},
): SudokuPadExport {
  const { data, warnings } = puzzleToFpuzzles(editor, grid, options)
  const compressed = compressToBase64(JSON.stringify(data))
  const url = `${SUDOKUPAD_BASE}?puzzleid=fpuzzles${encodeURIComponent(compressed)}`
  return { url, warnings }
}
