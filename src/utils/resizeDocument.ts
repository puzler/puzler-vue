import type { SerializedPuzzle } from './puzzleExport'
import { TYPE_TO_JSON_KEY, toolboxCategory, THERMO_TYPES, constraintDef } from '@/constraints/registry'
import { regionsForSize, boxIndexToLabel } from '@/stores/grid'

// Pure resize of a serialized puzzle document (doc space, 1-indexed): add or
// remove one row/column on any side, translating everything that survives and
// trimming what the removed line passes through — instances keep their valid
// remainder, shapes that would become invalid disappear. Callers apply the
// result through applyPuzzleJson, which makes the whole resize one undoable
// step (see editor.resizeGrid).
//
// Trim policy per family:
// - givens / solution / cell colors / single-cell marks: drop clipped keys.
// - plain lines (incl. cosmetic): split at clipped cells into contiguous runs;
//   runs of 2+ survive as separate instances.
// - between/lockout lines: endpoints are bulbs — any clipped cell drops the
//   instance (splitting would fabricate new bulbs).
// - thermos: clipped bulb drops the instance; each line truncates at its first
//   clipped cell; a bulb with no lines left drops.
// - arrows: clipped bulb cell drops the instance; arrow paths truncate at the
//   first clipped cell; a bulb with no arrows left survives.
// - cages / extra regions: drop clipped cells, delete when emptied; sums kept.
// - clones: trim originals (delete when emptied); drop copies whose surviving
//   cells would land outside the new grid.
// - connectors: both cells (all four for quadruples) must survive.
// - outer clues: dropped iff their anchor line (the row/column they point
//   along) is removed; otherwise re-anchored to the new ring.
// - texts / shapes: free positions translate and never drop.
// - cosmetic borders: edges with a clipped endpoint drop.

export type ResizeSide = 'top' | 'bottom' | 'left' | 'right'

interface ResizeContext {
  dRow: number
  dCol: number
  newRows: number
  newCols: number
}

const CELL_RE = /^r(\d+)c(\d+)$/

function parseDocCell(key: unknown): { row: number; col: number } | null {
  if (typeof key !== 'string') return null
  const m = key.match(CELL_RE)
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null
}

// Translated key, or null when the cell leaves the new grid.
function mapCell(ctx: ResizeContext, key: unknown): string | null {
  const pos = parseDocCell(key)
  if (!pos) return null
  const row = pos.row + ctx.dRow
  const col = pos.col + ctx.dCol
  if (row < 1 || row > ctx.newRows || col < 1 || col > ctx.newCols) return null
  return `r${row}c${col}`
}

function mapCellRecord<T>(ctx: ResizeContext, record: Record<string, T> | undefined): Record<string, T> | undefined {
  if (!record) return undefined
  const out: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    const mapped = mapCell(ctx, key)
    if (mapped) out[mapped] = value
  }
  return out
}

// Translate a path, splitting into contiguous runs where cells clipped out.
function splitRuns(ctx: ResizeContext, cells: unknown[]): string[][] {
  const runs: string[][] = []
  let current: string[] = []
  for (const cell of cells) {
    const mapped = mapCell(ctx, cell)
    if (mapped) {
      current.push(mapped)
    } else if (current.length) {
      runs.push(current)
      current = []
    }
  }
  if (current.length) runs.push(current)
  return runs
}

// Translate keeping order; null when any cell clipped (all-or-nothing shapes).
function mapAllCells(ctx: ResizeContext, cells: unknown[]): string[] | null {
  const out: string[] = []
  for (const cell of cells) {
    const mapped = mapCell(ctx, cell)
    if (!mapped) return null
    out.push(mapped)
  }
  return out
}

function mapSomeCells(ctx: ResizeContext, cells: unknown[]): string[] {
  return cells.map((c) => mapCell(ctx, c)).filter((c): c is string => c !== null)
}

type DocRecord = Record<string, unknown>

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

// ── Per-family instance transforms (return the replacement list) ────────────

function resizePlainLines(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    return splitRuns(ctx, asArray(e.cells))
      .filter((run) => run.length >= 2)
      .map((run) => ({ ...e, cells: run }))
  })
}

function resizeEndpointLines(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const cells = mapAllCells(ctx, asArray(e.cells))
    return cells && cells.length >= 2 ? [{ ...e, cells }] : []
  })
}

function resizeThermos(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const bulb = mapCell(ctx, e.bulb)
    if (!bulb) return []
    const lines = asArray(e.lines)
      .map((line) => {
        const out: string[] = []
        for (const cell of asArray(line)) {
          const mapped = mapCell(ctx, cell)
          if (!mapped) break // the subtree beyond a clipped cell is disconnected
          out.push(mapped)
        }
        return out
      })
      .filter((line) => line.length >= 2) // a doc line starts at the bulb
    return lines.length ? [{ ...e, bulb, lines }] : []
  })
}

function resizeArrows(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const bulbCells = mapAllCells(ctx, asArray(e.bulbCells))
    if (!bulbCells || bulbCells.length === 0) return []
    const arrows = asArray(e.arrows)
      .map((path) => {
        const out: string[] = []
        for (const cell of asArray(path)) {
          const mapped = mapCell(ctx, cell)
          if (!mapped) break
          out.push(mapped)
        }
        return out
      })
      .filter((path) => path.length >= 2)
    return [{ ...e, bulbCells, arrows }]
  })
}

function resizeCellGroups(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const cells = mapSomeCells(ctx, asArray(e.cells))
    return cells.length ? [{ ...e, cells }] : []
  })
}

function resizeClones(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const cells = mapSomeCells(ctx, asArray(e.cells))
    if (!cells.length) return []
    const copies = asArray(e.copies).filter((copy) => {
      const { dRow = 0, dCol = 0 } = (copy ?? {}) as { dRow?: number; dCol?: number }
      return cells.every((cell) => {
        const pos = parseDocCell(cell)!
        const row = pos.row + dRow
        const col = pos.col + dCol
        return row >= 1 && row <= ctx.newRows && col >= 1 && col <= ctx.newCols
      })
    })
    return [{ ...e, cells, copies }]
  })
}

function resizeConnectors(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const cells = mapAllCells(ctx, asArray(e.cells))
    return cells ? [{ ...e, cells }] : []
  })
}

// The step a little-killer direction takes from its clue position.
const LITTLE_KILLER_STEP: Record<string, [number, number]> = {
  'up-left': [-1, -1],
  'up-right': [-1, 1],
  'down-left': [1, -1],
  'down-right': [1, 1],
}

function resizeOuterClues(ctx: ResizeContext, oldRows: number, oldCols: number, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const pos = parseDocCell(e.cell)
    if (!pos) return []
    const onRowRing = pos.row === 0 || pos.row === oldRows + 1
    const onColRing = pos.col === 0 || pos.col === oldCols + 1

    let row: number
    if (onRowRing) {
      // Ring position: recompute against the new dimensions.
      row = pos.row === 0 ? 0 : ctx.newRows + 1
    } else {
      // Anchored to a grid row: the clue dies with it.
      row = pos.row + ctx.dRow
      if (row < 1 || row > ctx.newRows) return []
    }
    let col: number
    if (onColRing) {
      col = pos.col === 0 ? 0 : ctx.newCols + 1
    } else {
      col = pos.col + ctx.dCol
      if (col < 1 || col > ctx.newCols) return []
    }

    // Little killers may sit on corners and must still point at a real cell.
    const step = typeof e.direction === 'string' ? LITTLE_KILLER_STEP[e.direction] : undefined
    if (step) {
      const firstRow = row + step[0]
      const firstCol = col + step[1]
      if (firstRow < 1 || firstRow > ctx.newRows || firstCol < 1 || firstCol > ctx.newCols) return []
    }

    return [{ ...e, cell: `r${row}c${col}` }]
  })
}

function resizeSingleCellMarks(ctx: ResizeContext, entries: unknown[]): unknown[] {
  return entries.flatMap((entry): unknown[] => {
    if (typeof entry === 'string') {
      const mapped = mapCell(ctx, entry)
      return mapped ? [mapped] : []
    }
    const e = entry as DocRecord
    const mapped = mapCell(ctx, e.cell)
    return mapped ? [{ ...e, cell: mapped }] : []
  })
}

function resizeBorders(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.flatMap((entry) => {
    const e = entry as DocRecord
    const edges = asArray(e.edges)
      .map((pair) => mapAllCells(ctx, asArray(pair)))
      .filter((pair): pair is string[] => pair !== null && pair.length === 2)
    return edges.length ? [{ ...e, edges }] : []
  })
}

function resizeFreeCosmetics(ctx: ResizeContext, entries: unknown[]): DocRecord[] {
  return entries.map((entry) => {
    const e = entry as DocRecord
    const pos = (e.pos ?? { x: 1.5, y: 1.5 }) as { x: number; y: number }
    return { ...e, pos: { x: pos.x + ctx.dCol, y: pos.y + ctx.dRow } }
  })
}

// ── Sections ─────────────────────────────────────────────────────────────────

// The implicit standard-box layout, materialized so a resize doesn't silently
// drop the boxes (an omitted `regions` on a non-square document hydrates to
// all-regionless). Uses the OLD dimensions.
function materializeRegions(doc: SerializedPuzzle): Record<string, string[]> | undefined {
  if (doc.grid.regions) return doc.grid.regions
  if (doc.grid.rows !== doc.grid.cols) return undefined
  const layout = regionsForSize(doc.grid.rows)
  const out: Record<string, string[]> = {}
  for (let r = 0; r < doc.grid.rows; r++) {
    for (let c = 0; c < doc.grid.cols; c++) {
      const label = boxIndexToLabel(layout[r][c])
      ;(out[label] ??= []).push(`r${r + 1}c${c + 1}`)
    }
  }
  return out
}

function resizeConstraintEntry(ctx: ResizeContext, oldRows: number, oldCols: number, type: string, entry: unknown): unknown {
  const category = toolboxCategory(type)
  const entries = asArray(entry)
  if (category === 'single_cell') return resizeSingleCellMarks(ctx, entries)
  if (category === 'connector') return resizeConnectors(ctx, entries)
  if (category === 'outer') return resizeOuterClues(ctx, oldRows, oldCols, entries)
  if (THERMO_TYPES.has(type)) return resizeThermos(ctx, entries)
  if (type === 'arrow') return resizeArrows(ctx, entries)
  if (type === 'between_lines' || type === 'lockout_lines') return resizeEndpointLines(ctx, entries)
  if (type === 'clone') return resizeClones(ctx, entries)
  if (category === 'region') return resizeCellGroups(ctx, entries)
  if (category === 'line') return resizePlainLines(ctx, entries)
  return entry
}

function resizeCosmeticEntry(ctx: ResizeContext, type: string, entry: unknown): unknown {
  if (type === 'cell_color') return mapCellRecord(ctx, entry as Record<string, string>)
  if (type === 'cosmetic_line') return resizePlainLines(ctx, asArray(entry))
  if (type === 'cosmetic_border') return resizeBorders(ctx, asArray(entry))
  if (type === 'cosmetic_cage') return resizeCellGroups(ctx, asArray(entry))
  if (type === 'text' || type === 'shape') return resizeFreeCosmetics(ctx, asArray(entry))
  return entry
}

export function resizeDocument(doc: SerializedPuzzle, side: ResizeSide, delta: 1 | -1): SerializedPuzzle {
  const oldRows = doc.grid.rows
  const oldCols = doc.grid.cols
  const vertical = side === 'top' || side === 'bottom'
  const newRows = vertical ? oldRows + delta : oldRows
  const newCols = vertical ? oldCols : oldCols + delta
  const ctx: ResizeContext = {
    // Top/left changes shift every surviving coordinate; bottom/right don't.
    dRow: side === 'top' ? delta : 0,
    dCol: side === 'left' ? delta : 0,
    newRows,
    newCols,
  }

  // Materialize the implicit square layout BEFORE translating, then translate.
  // An emptied map stays an explicit {} — omitting it on a square result would
  // resurrect the standard boxes on hydration.
  const materialized = materializeRegions(doc)
  let regions: Record<string, string[]> | undefined
  if (materialized) {
    regions = {}
    for (const [label, cells] of Object.entries(materialized)) {
      const kept = mapSomeCells(ctx, cells)
      if (kept.length) regions[label] = kept
    }
  }

  const constraints = doc.constraints
    ? Object.fromEntries(
        Object.entries(doc.constraints).map(([key, entry]) => {
          const type = [...TYPE_TO_JSON_KEY.entries()].find(([, k]) => k === key)?.[0]
          return [key, type ? resizeConstraintEntry(ctx, oldRows, oldCols, type, entry) : entry]
        }),
      )
    : undefined

  const cosmetics = doc.cosmetics
    ? Object.fromEntries(
        Object.entries(doc.cosmetics).map(([key, entry]) => {
          const type = [...TYPE_TO_JSON_KEY.entries()].find(([, k]) => k === key)?.[0]
          // Presets keys aren't kinds; they pass through untouched.
          if (!type || constraintDef(type)?.toolbox?.category !== 'cosmetic') return [key, entry]
          return [key, resizeCosmeticEntry(ctx, type, entry)]
        }),
      )
    : undefined

  return {
    ...doc,
    grid: {
      rows: newRows,
      cols: newCols,
      ...(doc.grid.digits !== undefined ? { digits: doc.grid.digits } : {}),
      ...(regions ? { regions } : {}),
    },
    ...(doc.solution !== undefined && doc.solution !== null
      ? { solution: mapCellRecord(ctx, doc.solution) }
      : {}),
    ...(doc.givenDigits ? { givenDigits: mapCellRecord(ctx, doc.givenDigits) } : {}),
    ...(constraints ? { constraints } : {}),
    ...(cosmetics ? { cosmetics } : {}),
  }
}
