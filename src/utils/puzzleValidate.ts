import {
  JSON_KEY_TO_TYPE, TYPE_TO_JSON_KEY, PRESETS_KEY_BY_TYPE, GLOBAL_GROUPS_JSON,
  toolboxCategory, THERMO_TYPES, SINGLE_CELL_EXCLUSIONS, GLOBAL_VARIANT_EXCLUSIONS,
  INSTANCE_COLOR_FIELDS,
} from '@/constraints/registry'
import { QUADRUPLE_MAX_DIGITS, MAX_COSMETIC_TEXT_LEN, OUTER_RUN_DIRECTIONS, outerClueDirections, validLittleKillerDirections } from '@/types/constraints'
import type { OuterClueRunDirection } from '@/types/constraints'
import type { SerializedPuzzle } from './puzzleExport'
import { GRID_MAX } from './puzzleJson'
import { defaultDigitRange } from '@/composables/useGrid'

// Pre-apply validation for hand-edited documents (the raw JSON editor). The
// dividing line, per the product stance: FUNCTIONALLY BROKEN = error (cannot
// hydrate or render — malformed keys, impossible geometry, wrong shapes);
// WEIRD CHOICE = allowed, at most warned (out-of-bounds cells, duplicate
// objects, exclusion violations, suspicious values). Runs on the MIGRATED v4
// document; every issue speaks 1-indexed document coordinates.

export interface PuzzleIssue {
  path: string
  message: string
}

export interface PuzzleValidation {
  errors: PuzzleIssue[]
  warnings: PuzzleIssue[]
}

const CELL_RE = /^r(-?\d+)c(-?\d+)$/
const HEX_RE = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/

interface Ctx {
  rows: number
  cols: number
  // The effective value range: grid.digits when set, else the long side.
  digitRange: number
  // Void cells: with regions painted, cells listed under no label are dead
  // space (1-indexed doc keys). Empty when the grid has no regions.
  voids: Set<string>
  errors: PuzzleIssue[]
  warnings: PuzzleIssue[]
}

function parseCell(cell: unknown): { row: number; col: number } | null {
  if (typeof cell !== 'string') return null
  const m = CELL_RE.exec(cell)
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null
}

// Cell-bound data (everything except outer-clue cells) must be ≥ r1c1: rows or
// columns of 0 would convert to negative internal coordinates the app cannot
// represent. Out-of-bounds on the high side is a legitimate setter choice.
function checkCell(ctx: Ctx, cell: unknown, path: string): void {
  const pos = parseCell(cell)
  if (!pos) {
    ctx.errors.push({ path, message: `"${String(cell)}" is not a cell key (expected e.g. "r1c1")` })
    return
  }
  if (pos.row < 1 || pos.col < 1) {
    ctx.errors.push({ path, message: `${cell as string} is outside the representable grid (rows and columns start at 1)` })
  }
  if (ctx.voids.has(cell as string)) {
    ctx.warnings.push({ path, message: `${cell as string} belongs to no region; with regions painted it is a void (dead) cell` })
  }
}

// The received type, for `expected X, got Y` messages. Arrays describe their
// element kind so a uniformly wrong list reads as one mismatch.
function describeType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    const kinds = new Set(value.map((v) => (Array.isArray(v) ? 'Array' : v === null ? 'null' : typeof v)))
    return `Array<${kinds.size === 1 ? [...kinds][0] : 'mixed'}>`
  }
  return typeof value
}

function checkCellArray(ctx: Ctx, cells: unknown, path: string): cells is string[] {
  if (!Array.isArray(cells)) {
    ctx.errors.push({ path, message: 'expected Array<string>' })
    return false
  }
  // Wrong element TYPES collapse into one mismatch at the array; per-element
  // errors are reserved for semantic problems in well-typed elements (a string
  // that isn't a cell key names its exact position).
  if (cells.length > 0 && !cells.every((cell) => typeof cell === 'string')) {
    ctx.errors.push({ path, message: `expected Array<string>, got ${describeType(cells)}` })
    return false
  }
  cells.forEach((cell, i) => checkCell(ctx, cell, `${path}[${i}]`))
  return true
}

function warnDuplicateCells(ctx: Ctx, cells: string[], path: string): void {
  if (new Set(cells).size !== cells.length) {
    ctx.warnings.push({ path, message: 'lists the same cell more than once' })
  }
}

function checkDigit(ctx: Ctx, value: unknown, path: string): void {
  const max = ctx.digitRange
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    ctx.warnings.push({ path, message: `${String(value)} is outside the puzzle's digit range (1-${max})` })
  }
}

function checkColor(ctx: Ctx, value: unknown, path: string, allowNone = false): void {
  if (typeof value !== 'string') return
  if (allowNone && value === 'none') return
  if (!HEX_RE.test(value)) {
    ctx.warnings.push({ path, message: `"${value}" is not a 6 or 8 digit hex color` })
  }
}

function checkOpacity(ctx: Ctx, value: unknown, path: string): void {
  if (typeof value === 'number' && (value < 0 || value > 1)) {
    ctx.warnings.push({ path, message: `${value} is outside the 0-1 opacity range` })
  }
}

// Per-instance setter colors (JSON-editor feature): every field the type
// accepts per INSTANCE_COLOR_FIELDS is checked; unknown color-ish fields are
// left alone (they fall out on re-serialize).
function checkInstanceColors(ctx: Ctx, type: string, e: DocRecord, p: string): void {
  for (const field of INSTANCE_COLOR_FIELDS.get(type) ?? []) {
    checkColor(ctx, e[field], `${p}.${field}`)
  }
}

// ── Section validators ───────────────────────────────────────────────────────

function validateGrid(ctx: Ctx, doc: SerializedPuzzle): void {
  const { rows, cols, digits, regions } = doc.grid
  if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
    ctx.errors.push({ path: 'grid', message: 'rows and cols must be positive integers' })
  } else if (rows > GRID_MAX || cols > GRID_MAX) {
    ctx.errors.push({ path: 'grid', message: `rows and cols stay at or below ${GRID_MAX}` })
  }
  const autoHouses = doc.globals?.sudokuRules && doc.globals.sudokuRules.enabled !== false && doc.globals.sudokuRules.custom !== true
  if (digits !== undefined) {
    if (!Number.isInteger(digits) || digits < 2 || digits > 16) {
      ctx.errors.push({ path: 'grid.digits', message: 'digits must be an integer between 2 and 16' })
    } else if (digits < Math.max(rows, cols) && autoHouses) {
      ctx.warnings.push({
        path: 'grid.digits',
        message: `${digits} digits cannot fill the automatic full-length houses; enable custom houses or turn sudoku rules off`,
      })
    }
  } else if (autoHouses && Math.max(rows, cols) > 9) {
    // No explicit range on a big grid: the default is 9 (see
    // defaultDigitRange), so full-length automatic houses can never fill.
    ctx.warnings.push({
      path: 'grid.digits',
      message: `grids larger than 9 default to 9 digits, which cannot fill the automatic full-length houses; set grid.digits, enable custom houses, or turn sudoku rules off`,
    })
  }
  if (regions === undefined) return
  if (typeof regions !== 'object' || regions === null || Array.isArray(regions)) {
    ctx.errors.push({ path: 'grid.regions', message: 'expected Record<string, Array<string>>' })
    return
  }
  // Cells may appear under several labels: overlapping regions are how
  // conjoined grids share cells between boxes. Only within-label duplicates
  // are suspect (warned above).
  for (const [label, cells] of Object.entries(regions)) {
    const path = `grid.regions.${label}`
    if (!checkCellArray(ctx, cells, path)) continue
    warnDuplicateCells(ctx, cells, path)
  }
}

function validateCellValueMap(ctx: Ctx, map: unknown, path: string, digits: boolean): void {
  if (map === undefined || map === null) return
  if (typeof map !== 'object' || Array.isArray(map)) {
    ctx.errors.push({ path, message: digits ? 'expected Record<string, number>' : 'expected Record<string, string>' })
    return
  }
  for (const [cell, value] of Object.entries(map)) {
    checkCell(ctx, cell, `${path}.${cell}`)
    if (digits) checkDigit(ctx, value, `${path}.${cell}`)
  }
}

function validateGlobals(ctx: Ctx, doc: SerializedPuzzle): void {
  const globals = doc.globals
  if (globals === undefined) return
  if (typeof globals !== 'object' || globals === null || Array.isArray(globals)) {
    ctx.errors.push({ path: 'globals', message: 'expected Record<string, object>' })
    return
  }
  const groupsByKey = new Map(GLOBAL_GROUPS_JSON.map((g) => [g.key, g]))
  for (const [key, entry] of Object.entries(globals)) {
    const group = groupsByKey.get(key)
    if (!group) {
      ctx.warnings.push({ path: `globals.${key}`, message: `Unknown global constraint "${key}" will be removed` })
      continue
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      ctx.errors.push({ path: `globals.${key}`, message: 'expected object' })
      continue
    }
    const known = new Set([...group.variants.map((v) => v.key), ...Object.keys(group.customValues)])
    for (const field of Object.keys(entry)) {
      if (!known.has(field)) {
        ctx.warnings.push({ path: `globals.${key}.${field}`, message: `Unknown option "${field}" will be removed` })
      }
    }
    // Mutually exclusive variants both enabled: on apply the LATER one (in
    // the group's variant order) wins, matching the UI toggle behavior — warn
    // once per conflicting pair, naming the winner.
    group.variants.forEach((variant, idx) => {
      if (entry[variant.key] !== true) return
      const partnerType = GLOBAL_VARIANT_EXCLUSIONS[variant.type]
      const partnerIdx = group.variants.findIndex((v) => v.type === partnerType)
      if (partnerIdx === -1 || partnerIdx >= idx) return
      const partner = group.variants[partnerIdx]
      if (entry[partner.key] === true) {
        ctx.warnings.push({
          path: `globals.${key}`,
          message: `"${partner.key}" and "${variant.key}" are mutually exclusive, so "${variant.key}" will win`,
        })
      }
    })
  }
}

interface DocRecord { [k: string]: unknown }

function asRecordArray(ctx: Ctx, entry: unknown, path: string): DocRecord[] | null {
  if (!Array.isArray(entry)) {
    ctx.errors.push({ path, message: 'expected Array<object>' })
    return null
  }
  const bad = entry.findIndex((e) => typeof e !== 'object' || e === null)
  if (bad !== -1) {
    ctx.errors.push({ path: `${path}[${bad}]`, message: 'expected object' })
    return null
  }
  return entry as DocRecord[]
}

function validateConnector(ctx: Ctx, type: string, entries: DocRecord[], path: string, seenBorders: Map<string, string>): void {
  entries.forEach((e, i) => {
    const p = `${path}[${i}]`
    if (!checkCellArray(ctx, e.cells, `${p}.cells`)) return
    const cells = e.cells as string[]
    const parsed = cells.map(parseCell)
    if (parsed.some((c) => c === null)) return // malformed already reported
    if (type === 'quadruples') {
      if (cells.length !== 4) {
        ctx.errors.push({ path: p, message: 'a quadruple needs exactly 4 cells (the 2×2 block around its corner)' })
        return
      }
      const rows = parsed.map((c) => c!.row)
      const cols = parsed.map((c) => c!.col)
      const minR = Math.min(...rows)
      const minC = Math.min(...cols)
      const want = new Set([`${minR}|${minC}`, `${minR}|${minC + 1}`, `${minR + 1}|${minC}`, `${minR + 1}|${minC + 1}`])
      const got = new Set(parsed.map((c) => `${c!.row}|${c!.col}`))
      if (want.size !== got.size || [...want].some((w) => !got.has(w))) {
        ctx.errors.push({ path: p, message: 'quadruple cells must form a 2×2 block' })
        return
      }
      const values = e.values
      if (values !== undefined && !Array.isArray(values)) {
        ctx.errors.push({ path: `${p}.values`, message: 'expected Array<number>' })
      } else if (Array.isArray(values)) {
        if (values.length > QUADRUPLE_MAX_DIGITS) {
          ctx.errors.push({ path: `${p}.values`, message: `a quadruple holds at most ${QUADRUPLE_MAX_DIGITS} digits` })
        }
        values.forEach((v, vi) => checkDigit(ctx, v, `${p}.values[${vi}]`))
      }
    } else {
      if (cells.length !== 2) {
        ctx.errors.push({ path: p, message: 'a connector needs exactly 2 cells' })
        return
      }
      const [a, b] = parsed as Array<{ row: number; col: number }>
      if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) !== 1) {
        ctx.errors.push({ path: p, message: 'connector cells must be orthogonally adjacent' })
        return
      }
    }
    const location = [...cells].sort().join('|')
    const prior = seenBorders.get(location)
    if (prior !== undefined) {
      ctx.warnings.push({ path: p, message: `another connector (${prior}) already sits between ${cells.join(' and ')}; both will be kept, stacked` })
    }
    seenBorders.set(location, TYPE_TO_JSON_KEY.get(type) ?? type)
    checkInstanceColors(ctx, type, e, p)
  })
}

function validateOuterClue(ctx: Ctx, type: string, entries: DocRecord[], path: string, seenCells: Map<string, string>): void {
  // Internal-coordinate liveness for the shared direction helpers: doc r1c1 is
  // internal (0,0). A cell is live when in-grid and not void.
  const isLive = (r: number, c: number) => !ctx.voids.has(`r${r + 1}c${c + 1}`)
  entries.forEach((e, i) => {
    const p = `${path}[${i}]`
    const pos = parseCell(e.cell)
    if (!pos) {
      ctx.errors.push({ path: `${p}.cell`, message: `"${String(e.cell)}" is not a cell key` })
      return
    }
    const onRowRing = pos.row === 0 || pos.row === ctx.rows + 1
    const onColRing = pos.col === 0 || pos.col === ctx.cols + 1
    const inRange = pos.row >= 0 && pos.row <= ctx.rows + 1 && pos.col >= 0 && pos.col <= ctx.cols + 1
    const inGrid = !onRowRing && !onColRing && inRange
    if (!inRange) {
      ctx.errors.push({
        path: `${p}.cell`,
        message: `${e.cell as string} is not on the outer clue ring (r0/r${ctx.rows + 1} rows or c0/c${ctx.cols + 1} columns) or in a void cell`,
      })
      return
    }
    if (inGrid && !ctx.voids.has(e.cell as string)) {
      ctx.errors.push({
        path: `${p}.cell`,
        message: `${e.cell as string} is a live cell; in-grid outer clues go in void cells (or on the r0/r${ctx.rows + 1}/c0/c${ctx.cols + 1} ring)`,
      })
      return
    }
    // The optional per-run toggles: named directions, straight clues only.
    const directions = Array.isArray(e.directions) ? (e.directions as unknown[]) : null
    if (directions) {
      if (type === 'little_killers') {
        ctx.warnings.push({ path: `${p}.directions`, message: 'little killers point along their own `direction`; `directions` has no effect' })
      }
      for (const [di, d] of directions.entries()) {
        if (!OUTER_RUN_DIRECTIONS.includes(d as OuterClueRunDirection)) {
          ctx.warnings.push({ path: `${p}.directions[${di}]`, message: `"${String(d)}" is not a run direction (up/down/left/right)` })
        }
      }
    }
    // Clues read maximal live runs starting at an adjacent cell; a clue with
    // no run constrains nothing (a pierced ring cell, a void with no live
    // neighbor, or every readable run toggled off).
    const internal = { row: pos.row - 1, col: pos.col - 1 }
    const readable = type === 'little_killers'
      ? validLittleKillerDirections(internal.row, internal.col, ctx.rows, ctx.cols, isLive).length > 0
      : outerClueDirections(internal.row, internal.col, ctx.rows, ctx.cols, isLive)
          .filter((d) => !directions || directions.includes(d)).length > 0
    if (!readable) {
      ctx.warnings.push({ path: `${p}.cell`, message: `the outer clue at ${e.cell as string} reads no cells (every adjacent run is void, outside the grid, or toggled off)` })
    }
    const prior = seenCells.get(e.cell as string)
    if (prior !== undefined) {
      ctx.warnings.push({ path: p, message: `another outer clue (${prior}) is already at ${e.cell as string}; both will be kept, stacked` })
    }
    seenCells.set(e.cell as string, TYPE_TO_JSON_KEY.get(type) ?? type)
    checkInstanceColors(ctx, type, e, p)
  })
}

function orthodiagonallyAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  const dr = Math.abs(a.row - b.row)
  const dc = Math.abs(a.col - b.col)
  return dr <= 1 && dc <= 1 && dr + dc > 0
}

// A list of cell PATHS (thermo lines, arrow paths). Any non-array elements —
// the classic mistake is a flat cell list, like the sibling bulbCells field —
// collapse into one mismatch naming the received type instead of a per-element
// error apiece.
function checkCellPathList(ctx: Ctx, value: unknown, path: string): value is unknown[] {
  if (!Array.isArray(value)) {
    ctx.errors.push({ path, message: 'expected Array<Array<string>>' })
    return false
  }
  if (value.length > 0 && !value.every(Array.isArray)) {
    ctx.errors.push({ path, message: `expected Array<Array<string>>, got ${describeType(value)}` })
    return false
  }
  return true
}

function validateInstanceEntry(ctx: Ctx, type: string, e: DocRecord, p: string): void {
  checkInstanceColors(ctx, type, e, p)
  if (THERMO_TYPES.has(type)) {
    checkCell(ctx, e.bulb, `${p}.bulb`)
    if (!checkCellPathList(ctx, e.lines, `${p}.lines`)) return
    e.lines.forEach((line, li) => {
      if (!checkCellArray(ctx, line, `${p}.lines[${li}]`)) return
      const parsed = (line as string[]).map(parseCell)
      for (let ci = 1; ci < parsed.length; ci++) {
        const a = parsed[ci - 1]
        const b = parsed[ci]
        if (a && b && !orthodiagonallyAdjacent(a, b)) {
          ctx.warnings.push({ path: `${p}.lines[${li}]`, message: `${(line as string[])[ci - 1]} and ${(line as string[])[ci]} are not adjacent` })
        }
      }
    })
    return
  }
  if (type === 'arrow') {
    if (!checkCellArray(ctx, e.bulbCells, `${p}.bulbCells`)) return
    if (!checkCellPathList(ctx, e.arrows, `${p}.arrows`)) return
    const anchors = new Set<string>(e.bulbCells as string[])
    for (const arrowCells of e.arrows as unknown[]) {
      if (Array.isArray(arrowCells)) for (const cell of arrowCells) anchors.add(cell as string)
    }
    e.arrows.forEach((arrowCells, ai) => {
      if (!checkCellArray(ctx, arrowCells, `${p}.arrows[${ai}]`)) return
      const first = (arrowCells as string[])[0]
      if (first !== undefined && !anchors.has(first)) {
        ctx.warnings.push({ path: `${p}.arrows[${ai}]`, message: `starts at ${first}, which is not on the bulb or another arrow` })
      }
    })
    return
  }
  if (type === 'clone') {
    if (!checkCellArray(ctx, e.cells, `${p}.cells`)) return
    warnDuplicateCells(ctx, e.cells as string[], `${p}.cells`)
    const copies = e.copies
    if (copies !== undefined && !Array.isArray(copies)) {
      ctx.errors.push({ path: `${p}.copies`, message: 'expected Array<{ dRow: number, dCol: number }>' })
      return
    }
    ;((copies as Array<{ dRow?: number; dCol?: number }>) ?? []).forEach((copy, ci) => {
      for (const cell of e.cells as string[]) {
        const pos = parseCell(cell)
        if (!pos) continue
        const row = pos.row + (copy.dRow ?? 0)
        const col = pos.col + (copy.dCol ?? 0)
        if (row < 1 || row > ctx.rows || col < 1 || col > ctx.cols) {
          ctx.warnings.push({ path: `${p}.copies[${ci}]`, message: 'places part of the clone outside the grid' })
          break
        }
      }
    })
    return
  }
  if (type === 'cosmetic_border') {
    // Each edge is the pair of 1-indexed cells it separates.
    const edges = e.edges
    if (!Array.isArray(edges)) {
      ctx.errors.push({ path: `${p}.edges`, message: 'expected Array<[string, string]>' })
      return
    }
    edges.forEach((pair, ei) => {
      const ep = `${p}.edges[${ei}]`
      if (!checkCellArray(ctx, pair, ep)) return
      const cells = pair as string[]
      if (cells.length !== 2) {
        ctx.errors.push({ path: ep, message: 'an edge is exactly the 2 cells it separates' })
        return
      }
      const [a, b] = cells.map(parseCell)
      if (a && b && Math.abs(a.row - b.row) + Math.abs(a.col - b.col) !== 1) {
        ctx.errors.push({ path: ep, message: 'edge cells must be orthogonally adjacent' })
      }
    })
    return
  }
  // Cages, extra regions, constraint lines, cosmetic lines/cages: cell lists.
  if (!checkCellArray(ctx, e.cells, `${p}.cells`)) return
  warnDuplicateCells(ctx, e.cells as string[], `${p}.cells`)
  if ('sum' in e && e.sum !== undefined && (typeof e.sum !== 'number' || e.sum < 1)) {
    ctx.warnings.push({ path: `${p}.sum`, message: `${String(e.sum)} is not a positive sum` })
  }
}

// A single-cell entry is the plain cell string, or { cell, ...colors } when
// the mark carries setter colors. Returns the parsed cell set for the
// exclusion-pair check, or null when the entry isn't even an array.
function validateSingleCellMarks(ctx: Ctx, type: string, entry: unknown, path: string): Set<string> | null {
  if (!Array.isArray(entry)) {
    ctx.errors.push({ path, message: 'expected Array<string | object>' })
    return null
  }
  // Same collapse rule as checkCellArray: wrong element TYPES become one
  // mismatch at the array; per-element errors are for semantic problems.
  const wellTyped = (item: unknown) =>
    typeof item === 'string' || (typeof item === 'object' && item !== null && !Array.isArray(item))
  if (entry.length > 0 && !entry.every(wellTyped)) {
    ctx.errors.push({ path, message: `expected Array<string | object>, got ${describeType(entry)}` })
    return null
  }
  const cells: string[] = []
  entry.forEach((item, i) => {
    if (typeof item === 'string') {
      checkCell(ctx, item, `${path}[${i}]`)
      cells.push(item)
      return
    }
    const rec = item as DocRecord
    checkCell(ctx, rec.cell, `${path}[${i}].cell`)
    if (typeof rec.cell === 'string') cells.push(rec.cell)
    checkInstanceColors(ctx, type, rec, `${path}[${i}]`)
  })
  if (new Set(cells).size !== cells.length) {
    ctx.warnings.push({ path, message: 'lists the same cell more than once' })
  }
  return new Set(cells)
}

function validateConstraints(ctx: Ctx, doc: SerializedPuzzle): void {
  const constraints = doc.constraints as Record<string, unknown> | undefined
  if (constraints === undefined) return
  if (typeof constraints !== 'object' || constraints === null || Array.isArray(constraints)) {
    ctx.errors.push({ path: 'constraints', message: 'expected Record<string, Array<object> | Array<string>>' })
    return
  }
  const seenBorders = new Map<string, string>()
  const seenOuterCells = new Map<string, string>()
  const singleCellsByType = new Map<string, Set<string>>()

  for (const [key, entry] of Object.entries(constraints)) {
    const path = `constraints.${key}`
    const type = JSON_KEY_TO_TYPE.get(key)
    const category = type ? toolboxCategory(type) : undefined
    if (!type || category === undefined || category === 'global' || category === 'cosmetic') {
      ctx.warnings.push({ path, message: `Unknown constraint "${key}" will be removed` })
      continue
    }
    if (category === 'single_cell') {
      const cells = validateSingleCellMarks(ctx, type, entry, path)
      if (cells) singleCellsByType.set(type, cells)
      continue
    }
    const entries = asRecordArray(ctx, entry, path)
    if (!entries) continue
    if (category === 'connector') validateConnector(ctx, type, entries, path, seenBorders)
    else if (category === 'outer') validateOuterClue(ctx, type, entries, path, seenOuterCells)
    else entries.forEach((e, i) => validateInstanceEntry(ctx, type, e, `${path}[${i}]`))
  }

  // Paired single-cell marks (odd/even, min/max) on the same cell.
  for (const [type, cells] of singleCellsByType) {
    const partner = SINGLE_CELL_EXCLUSIONS[type]
    if (!partner || type > partner) continue
    const partnerCells = singleCellsByType.get(partner)
    if (!partnerCells) continue
    for (const cell of cells) {
      if (partnerCells.has(cell)) {
        ctx.warnings.push({
          path: `constraints.${TYPE_TO_JSON_KEY.get(type)}`,
          message: `${cell} is marked as both ${TYPE_TO_JSON_KEY.get(type)} and ${TYPE_TO_JSON_KEY.get(partner)}`,
        })
      }
    }
  }
}

const PRESET_KINDS = new Map([...PRESETS_KEY_BY_TYPE.entries()].map(([type, key]) => [key, type]))

function validateCosmetics(ctx: Ctx, doc: SerializedPuzzle): void {
  const cosmetics = doc.cosmetics as Record<string, unknown> | undefined
  if (cosmetics === undefined) return
  if (typeof cosmetics !== 'object' || cosmetics === null || Array.isArray(cosmetics)) {
    ctx.errors.push({ path: 'cosmetics', message: 'expected Record<string, Array<object>>' })
    return
  }
  for (const [key, entry] of Object.entries(cosmetics)) {
    const path = `cosmetics.${key}`
    if (PRESET_KINDS.has(key)) {
      if (!Array.isArray(entry)) {
        ctx.errors.push({ path, message: 'expected Array<object>' })
        continue
      }
      const ids = (entry as Array<{ id?: string }>).map((preset) => preset.id)
      if (new Set(ids).size !== ids.length) {
        ctx.warnings.push({ path, message: 'contains duplicate preset ids' })
      }
      ;(entry as Array<{ style?: Record<string, unknown>; color?: unknown; opacity?: unknown }>).forEach((preset, i) => {
        checkColor(ctx, preset.color, `${path}[${i}].color`)
        checkOpacity(ctx, preset.opacity, `${path}[${i}].opacity`)
        const style = preset.style ?? {}
        checkColor(ctx, style.color, `${path}[${i}].style.color`)
        checkColor(ctx, style.fillColor, `${path}[${i}].style.fillColor`, true)
        checkColor(ctx, style.strokeColor, `${path}[${i}].style.strokeColor`)
        checkColor(ctx, style.textColor, `${path}[${i}].style.textColor`)
        checkColor(ctx, style.cageColor, `${path}[${i}].style.cageColor`)
        for (const field of ['opacity', 'fillOpacity', 'strokeOpacity', 'textOpacity', 'cageOpacity'] as const) {
          checkOpacity(ctx, style[field], `${path}[${i}].style.${field}`)
        }
        for (const field of ['width', 'height', 'strokeWidth', 'fontSize', 'textSize'] as const) {
          const value = style[field]
          if (typeof value === 'number' && value <= 0 && (field === 'width' || field === 'height')) {
            ctx.warnings.push({ path: `${path}[${i}].style.${field}`, message: `${value} makes the shape invisible` })
          }
        }
      })
      continue
    }
    const type = JSON_KEY_TO_TYPE.get(key)
    if (!type || toolboxCategory(type) !== 'cosmetic') {
      ctx.warnings.push({ path, message: `Unknown cosmetic "${key}" will be removed` })
      continue
    }
    if (type === 'cell_color') {
      validateCellValueMap(ctx, entry, path, false)
      continue
    }
    const entries = asRecordArray(ctx, entry, path)
    if (!entries) continue
    entries.forEach((e, i) => {
      const p = `${path}[${i}]`
      if (type === 'text' || type === 'shape') {
        const pos = e.pos as { x?: unknown; y?: unknown } | undefined
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
          ctx.errors.push({ path: `${p}.pos`, message: 'expected { x: number, y: number }' })
        }
        if (typeof e.content === 'string' && e.content.length > MAX_COSMETIC_TEXT_LEN) {
          ctx.warnings.push({ path: `${p}.content`, message: `exceeds the editor's ${MAX_COSMETIC_TEXT_LEN}-character limit` })
        }
      } else {
        validateInstanceEntry(ctx, type, e, p)
      }
    })
  }
}

const TOP_LEVEL_KEYS = new Set(['formatVersion', 'grid', 'meta', 'solution', 'givenDigits', 'globals', 'constraints', 'cosmetics', 'solverHelpers'])

// Solver helpers are setter DECLARATIONS about the puzzle's construction; a
// declaration the geometry contradicts would let the fog solver deduce wrongly,
// so each conflict is a warning (weird choice, not functionally broken).
function validateSolverHelpers(ctx: Ctx, doc: SerializedPuzzle): void {
  const helpers = doc.solverHelpers
  if (helpers === undefined) return
  if (typeof helpers !== 'object' || helpers === null || Array.isArray(helpers)) {
    ctx.errors.push({ path: 'solverHelpers', message: `expected an object, got ${describeType(helpers)}` })
    return
  }
  for (const key of Object.keys(helpers)) {
    if (key !== 'arrows' && key !== 'killerCages') {
      ctx.warnings.push({ path: `solverHelpers.${key}`, message: `Unknown helper group "${key}" will be removed` })
    }
  }
  const arrows = helpers.arrows
  if (!arrows) return
  const docs = (doc.constraints?.arrows ?? []) as Array<{ bulbCells?: unknown[]; arrows?: Array<{ cells?: unknown[] }> }>
  if (!Array.isArray(docs)) return
  if (arrows.singleCellBulbs && docs.some((a) => Array.isArray(a?.bulbCells) && a.bulbCells.length > 1)) {
    ctx.warnings.push({
      path: 'solverHelpers.arrows.singleCellBulbs',
      message: 'declares single-cell bulbs, but an arrow has a multi-cell bulb',
    })
  }
  if (arrows.oneArrowPerBulb && docs.some((a) => Array.isArray(a?.arrows) && a.arrows.length > 1)) {
    ctx.warnings.push({
      path: 'solverHelpers.arrows.oneArrowPerBulb',
      message: 'declares one arrow per bulb, but a bulb has multiple arrows',
    })
  }
  if (arrows.noCrossings) {
    // Any cell used by two arrows' bulbs/shafts conflicts, except a shared
    // arrowhead: the LAST cell of both of its arrows.
    const seen = new Map<string, 'body' | 'tip'>()
    let conflict = false
    for (const arrow of docs) {
      if (conflict) break
      const body = new Set<string>((Array.isArray(arrow?.bulbCells) ? arrow.bulbCells : []).filter((c): c is string => typeof c === 'string'))
      const tips = new Set<string>()
      for (const path of Array.isArray(arrow?.arrows) ? arrow.arrows : []) {
        const cells = (Array.isArray(path?.cells) ? path.cells : []).filter((c): c is string => typeof c === 'string')
        // cells[0] anchors on the bulb/another arrow of the SAME instance.
        for (const cell of cells.slice(1, -1)) { tips.delete(cell); body.add(cell) }
        const tip = cells[cells.length - 1]
        if (tip !== undefined && cells.length > 1 && !body.has(tip)) tips.add(tip)
      }
      for (const cell of body) {
        if (seen.has(cell)) { conflict = true; break }
      }
      for (const cell of tips) {
        if (seen.get(cell) === 'body') { conflict = true; break }
      }
      if (conflict) break
      for (const cell of body) seen.set(cell, 'body')
      for (const cell of tips) if (!seen.has(cell)) seen.set(cell, 'tip')
    }
    if (conflict) {
      ctx.warnings.push({
        path: 'solverHelpers.arrows.noCrossings',
        message: 'declares no crossings, but two arrows share a non-tip cell',
      })
    }
  }
}

export function validatePuzzle(doc: SerializedPuzzle): PuzzleValidation {
  const rows = typeof doc.grid?.rows === 'number' ? doc.grid.rows : 0
  const cols = typeof doc.grid?.cols === 'number' ? doc.grid.cols : 0
  // Doc-side void set: regions present + a cell listed nowhere = void.
  const voids = new Set<string>()
  const regions = doc.grid?.regions
  if (regions && typeof regions === 'object' && !Array.isArray(regions) && Object.keys(regions).length > 0) {
    const regioned = new Set(Object.values(regions).flat())
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const key = `r${r}c${c}`
        if (!regioned.has(key)) voids.add(key)
      }
    }
  }
  const ctx: Ctx = {
    rows,
    cols,
    digitRange: typeof doc.grid?.digits === 'number' ? doc.grid.digits : defaultDigitRange(rows, cols),
    voids,
    errors: [],
    warnings: [],
  }
  if (typeof doc.grid !== 'object' || doc.grid === null) {
    return { errors: [{ path: 'grid', message: 'missing grid section' }], warnings: [] }
  }
  for (const key of Object.keys(doc)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      ctx.warnings.push({ path: key, message: `Unknown field "${key}" will be removed` })
    }
  }
  validateGrid(ctx, doc)
  validateCellValueMap(ctx, doc.givenDigits, 'givenDigits', true)
  validateCellValueMap(ctx, doc.solution, 'solution', true)
  validateGlobals(ctx, doc)
  validateConstraints(ctx, doc)
  validateCosmetics(ctx, doc)
  validateSolverHelpers(ctx, doc)
  return { errors: ctx.errors, warnings: ctx.warnings }
}
