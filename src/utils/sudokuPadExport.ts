import { compressToBase64 } from 'lz-string'
import { keyToRowCol } from '@/composables/useGrid'
import {
  borderKeyCells,
  cornerKeyToRowCol,
  parseOuterKey,
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
  ShapeData,
  ShapeAnchor,
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

// Puzler cell key (r{row}c{col}, 0-indexed) → f-puzzles label (R{n}C{n}, 1-indexed).
function fpCell(key: string): string {
  const { row, col } = keyToRowCol(key)
  return `R${row + 1}C${col + 1}`
}

// f-puzzles places cosmetics on a continuous grid where a cell centre is an
// integer coordinate and edges/corners fall on half-integers. Anchors offset
// the centre by half a cell.
const ANCHOR_OFFSET: Record<ShapeAnchor, { dr: number; dc: number }> = {
  'center': { dr: 0, dc: 0 },
  'top': { dr: -0.5, dc: 0 },
  'bottom': { dr: 0.5, dc: 0 },
  'left': { dr: 0, dc: -0.5 },
  'right': { dr: 0, dc: 0.5 },
  'top-left': { dr: -0.5, dc: -0.5 },
  'top-right': { dr: -0.5, dc: 0.5 },
  'bottom-left': { dr: 0.5, dc: -0.5 },
  'bottom-right': { dr: 0.5, dc: 0.5 },
}
function fpAnchoredCell(key: string, anchor: ShapeAnchor): string {
  const { row, col } = keyToRowCol(key)
  const { dr, dc } = ANCHOR_OFFSET[anchor]
  return `R${row + 1 + dr}C${col + 1 + dc}`
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
// whispers and lockout have no f-puzzles equivalent — handled as warnings.
const CONSTRAINT_LINE_FIELD: Record<string, string> = {
  renban: 'renban',
  german_whispers: 'whispers',
  palindrome: 'palindrome',
  region_sum: 'regionsumline',
  between_lines: 'betweenline',
}

export interface SudokuPadExport {
  url: string
  // Human-readable notes about anything that couldn't be represented in
  // f-puzzles, so the setter knows what to re-create by hand in SudokuPad.
  warnings: string[]
}

// Builds the f-puzzles object (and any warnings) for the current puzzle. Kept
// separate from URL building so it can be unit-tested directly.
export function puzzleToFpuzzles(
  editor: EditorStore,
  grid: GridStore,
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
  if (editor.puzzleAuthor) fp.author = editor.puzzleAuthor
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
      const colorId = editor.cosmeticCellColors[key]
      if (colorId && colorById.has(colorId)) cell.c = colorById.get(colorId)
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
  // cosmetic line. It shows where the rule applies but isn't enforced.
  for (const kind of ['positive', 'negative'] as const) {
    if (!variants.has(`anti_${kind}_diagonal`)) continue
    push(fp, 'line', {
      lines: [diagonalCells(kind, size).map(fpCell)],
      outlineC: '#f06292', width: 0.05,
    })
    warnings.push('Anti-diagonal is not a SudokuPad constraint; exported as a cosmetic line only (not enforced).')
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
        warnings.push('Dutch Whispers lines have no SudokuPad equivalent; exported as plain lines instead.')
        push(fp, 'line', {
          lines: [(inst.data as ConstraintLineData).cells.map(fpCell)],
          outlineC: '#10b981', width: 0.1,
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
          cells: [fpAnchoredCell(data.cell, data.anchor)],
          baseC: fpColor(style?.fillColor ?? 'none'),
          outlineC: style?.strokeColor ?? '#333333',
          fontC: '#000000',
          width: diameter, height: diameter, value: '',
        }
        if (isDiamond) entry.angle = 45
        push(fp, field, entry)
        break
      }
      case 'text': {
        const data = inst.data as TextData
        const preset = (editor.textPresets as TextPreset[]).find((p) => p.id === data.presetId)
        push(fp, 'text', {
          cells: [fpCell(data.cell)],
          value: preset?.content ?? '',
          fontC: preset?.style.color ?? '#333333',
          size: (preset?.style.fontSize ?? 20) / 50,
        })
        break
      }
      default: {
        // Constraint lines that map directly by name.
        const field = CONSTRAINT_LINE_FIELD[inst.type]
        if (field) push(fp, field, { lines: [(inst.data as ConstraintLineData).cells.map(fpCell)] })
      }
    }
  }

  return { data: fp, warnings }
}

// Compresses the f-puzzles JSON the way SudokuPad expects and returns a loadable
// URL plus any fidelity warnings.
export function exportToSudokuPad(editor: EditorStore, grid: GridStore): SudokuPadExport {
  const { data, warnings } = puzzleToFpuzzles(editor, grid)
  const compressed = compressToBase64(JSON.stringify(data))
  const url = `${SUDOKUPAD_BASE}?puzzleid=fpuzzles${encodeURIComponent(compressed)}`
  return { url, warnings }
}
