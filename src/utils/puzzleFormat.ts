import type { ThermoEdge } from '@/types/constraints'
import { borderKey, cornerKeyToRowCol, cornerKey, parseOuterKey, outerKey } from '@/types/constraints'
import { regionsForSize, boxIndexToLabel } from '@/stores/grid'

// Conversions between the app's internal representations and the serialized
// puzzle document (format v4). Shared by the serializer (puzzleExport) and the
// v3→v4 migrator (puzzleMigrate) — kept separate from both to avoid an import
// cycle (puzzleExport calls the migrator on hydrate).
//
// The document is 1-INDEXED (`r1c1` = top-left, matching sudoku convention and
// f-puzzles); the app stays 0-indexed internally. The outer clue ring is
// `r0` / `r{rows+1}` in document coordinates, so the document never needs
// negative numbers or the internal `o:` prefix.

const CELL_RE = /^r(-?\d+)c(-?\d+)$/

function shiftCellKey(key: string, delta: number): string {
  const m = CELL_RE.exec(key)
  if (!m) return key // malformed keys pass through; validation reports them
  return `r${Number(m[1]) + delta}c${Number(m[2]) + delta}`
}

// Internal cell key → document cell key and back.
export const docCell = (key: string) => shiftCellKey(key, 1)
export const internalCell = (key: string) => shiftCellKey(key, -1)

export function docCells(keys: string[]): string[] {
  return keys.map(docCell)
}
export function internalCells(keys: string[]): string[] {
  return keys.map(internalCell)
}

// Map keyed by cell (givenDigits, solution, cellColors) → shifted keys.
export function shiftMapKeys<T>(map: Record<string, T>, delta: number): Record<string, T> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [shiftCellKey(k, delta), v]))
}

// Free positions (text/shape cosmetics) are in cell units where the internal
// cell (row, col)'s centre is { x: col + 0.5, y: row + 0.5 } — shift so the
// DOCUMENT reads r1c1's centre as { x: 1.5, y: 1.5 }.
export function docPos(pos: { x: number; y: number }): { x: number; y: number } {
  return { x: pos.x + 1, y: pos.y + 1 }
}
export function internalPos(pos: { x: number; y: number }): { x: number; y: number } {
  return { x: pos.x - 1, y: pos.y - 1 }
}

// ── Outer clue positions ─────────────────────────────────────────────────────
// Internal `o:r-1c3` ↔ document `r0c4`.

export function docOuterCell(location: string): string {
  const pos = parseOuterKey(location)
  if (!pos) return location
  return `r${pos.row + 1}c${pos.col + 1}`
}

export function outerLocationFromDoc(cell: string): string {
  const m = CELL_RE.exec(cell)
  if (!m) return cell
  return outerKey(Number(m[1]) - 1, Number(m[2]) - 1)
}

// ── Connector locations ──────────────────────────────────────────────────────
// Border key `r4c4|r4c5` ↔ document cell pair; corner key `+r4c4` ↔ the 2×2
// document block whose shared corner it names (reading order).

export function borderLocationToDocCells(location: string): string[] {
  return location.split('|').map(docCell)
}

export function borderLocationFromDocCells(cells: string[]): string {
  const [a, b] = cells.map(internalCell)
  return borderKey(a, b)
}

export function cornerLocationToDocCells(location: string): string[] {
  const corner = cornerKeyToRowCol(location)
  if (!corner) return []
  const { row, col } = corner // internal corner (r, c) = document top-left cell (r, c)
  return [`r${row}c${col}`, `r${row}c${col + 1}`, `r${row + 1}c${col}`, `r${row + 1}c${col + 1}`]
}

export function cornerLocationFromDocCells(cells: string[]): string {
  const parsed = cells.map((c) => CELL_RE.exec(c)).filter((m): m is RegExpExecArray => m !== null)
  const row = Math.min(...parsed.map((m) => Number(m[1])))
  const col = Math.min(...parsed.map((m) => Number(m[2])))
  return cornerKey(row, col)
}

// ── Thermometers ─────────────────────────────────────────────────────────────
// Internal { root, edges } ↔ document { bulb, lines } where each line is a cell
// path starting at the bulb or at a branch point. The walk follows edge order,
// so serialize(hydrate(doc)) reproduces the document's lines.

export function thermoEdgesToLines(root: string, edges: ThermoEdge[]): string[][] {
  const lines: string[][] = []
  const used = new Array<boolean>(edges.length).fill(false)
  const reached = new Set([root])
  let remaining = edges.length
  while (remaining > 0) {
    const startIdx = edges.findIndex((e, i) => !used[i] && reached.has(e.from))
    if (startIdx === -1) break // edges disconnected from the bulb: dropped
    const line = [edges[startIdx].from, edges[startIdx].to]
    used[startIdx] = true
    remaining--
    reached.add(edges[startIdx].to)
    for (;;) {
      const tail = line[line.length - 1]
      const nextIdx = edges.findIndex((e, i) => !used[i] && e.from === tail)
      if (nextIdx === -1) break
      line.push(edges[nextIdx].to)
      used[nextIdx] = true
      remaining--
      reached.add(edges[nextIdx].to)
    }
    lines.push(line)
  }
  return lines
}

export function thermoLinesToEdges(lines: string[][]): ThermoEdge[] {
  return lines.flatMap((line) => line.slice(0, -1).map((c, i) => ({ from: c, to: line[i + 1] })))
}

// ── Regions ──────────────────────────────────────────────────────────────────
// Document `grid.regions` is region-first: label → complete cell list; omitted
// entirely = standard box layout; a cell listed nowhere = regionless; a cell
// listed under several labels belongs to all of them (conjoined grids overlap
// their boxes). The store keeps the sparse per-cell override map of sorted
// label lists, so both directions expand/compact.

// Standard box label for an internal cell, or null when the grid has none
// (non-square grids have no default layout).
function standardRegionLabel(rows: number, cols: number, row: number, col: number): string | null {
  if (rows !== cols) return null
  return boxIndexToLabel(regionsForSize(rows)[row][col])
}

// Effective per-cell labels under the sparse override map (mirrors the grid
// store's cellRegionLabelMap, usable outside a Pinia context). Sorted; empty
// = regionless.
function effectiveRegionLabels(
  overrides: Record<string, string[]> | null | undefined,
  rows: number,
  cols: number,
  row: number,
  col: number,
): string[] {
  const key = `r${row}c${col}`
  if (overrides && key in overrides) return overrides[key]
  const standard = standardRegionLabel(rows, cols, row, col)
  return standard === null ? [] : [standard]
}

// Region-first document form, or undefined when the effective layout equals
// the standard boxes (canonical: standard layouts are always omitted).
export function regionsToDoc(
  overrides: Record<string, string[]> | null | undefined,
  rows: number,
  cols: number,
): Record<string, string[]> | undefined {
  if (!overrides) return undefined
  const regions: Record<string, string[]> = {}
  let differs = false
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const labels = effectiveRegionLabels(overrides, rows, cols, r, c)
      const standard = standardRegionLabel(rows, cols, r, c)
      if (labels.length !== 1 || labels[0] !== standard) differs = true
      for (const label of labels) (regions[label] ??= []).push(`r${r + 1}c${c + 1}`)
    }
  }
  if (!differs) return undefined
  return Object.fromEntries(Object.keys(regions).sort().map((l) => [l, regions[l]]))
}

// Inverse: expand a document layout into the complete per-cell map (listed
// cells collect every label naming them, sorted; unlisted cells are
// explicitly regionless).
export function regionsFromDoc(
  regions: Record<string, string[]>,
  rows: number,
  cols: number,
): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) map[`r${r}c${c}`] = []
  }
  for (const label of Object.keys(regions).sort()) {
    for (const cell of regions[label]) {
      const key = internalCell(cell)
      if (map[key] !== undefined && !map[key].includes(label)) map[key].push(label)
    }
  }
  return map
}
