// ── Color ─────────────────────────────────────────────────────────────────────
// Defined here directly; will be replaced with GraphQL codegen output once
// codegen is configured.

export interface Color {
  red: number     // 0–255
  green: number   // 0–255
  blue: number    // 0–255
  opacity: number // 0–1
}

function greyscale(value: number): Color {
  return { red: value, green: value, blue: value, opacity: 1 }
}

export function colorToCss(c: Color): string {
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${c.opacity})`
}

// ── Line styles ───────────────────────────────────────────────────────────────

export interface LineStyle {
  color: Color
  width: number // fraction of cell size
}

export const LINE_STYLES: Record<string, LineStyle> = {
  palindrome:      { color: greyscale(192),                                  width: 0.35 },
  renban:          { color: { red: 240, green: 103, blue: 240, opacity: 1 }, width: 0.35 },
  german_whispers: { color: { red: 103, green: 240, blue: 103, opacity: 1 }, width: 0.35 },
  dutch_whispers:  { color: { red: 255, green: 111, blue: 0,   opacity: 1 }, width: 0.35 },
  region_sum:      { color: { red: 0,   green: 200, blue: 255, opacity: 1 }, width: 0.35 },
  between_lines:   { color: greyscale(187),                                  width: 0.1  },
}

// ── Shape styles ──────────────────────────────────────────────────────────────

export interface ShapeStyle {
  fillColor:    Color
  outlineColor: Color
  textColor:    Color
  width:  number // fraction of cell size
  height: number // fraction of cell size
}

export const SHAPE_STYLES: Record<string, ShapeStyle> = {
  odd_cells:          { fillColor: greyscale(187), outlineColor: greyscale(187), textColor: greyscale(187), height: 0.75, width: 0.75 },
  even_cells:         { fillColor: greyscale(187), outlineColor: greyscale(187), textColor: greyscale(187), height: 0.70, width: 0.70 },
  ratio_dots:         { fillColor: greyscale(0),   outlineColor: greyscale(0),   textColor: greyscale(255), height: 0.25, width: 0.25 },
  difference_dots:    { fillColor: greyscale(255), outlineColor: greyscale(0),   textColor: greyscale(0),   height: 0.25, width: 0.25 },
  between_lines_bulb: { fillColor: greyscale(255), outlineColor: greyscale(187), textColor: greyscale(0),   height: 0.80, width: 0.80 },
  quadruples:         { fillColor: greyscale(255), outlineColor: greyscale(0),   textColor: greyscale(0),   height: 0.50, width: 0.50 },
}

// ── Text styles ───────────────────────────────────────────────────────────────

export interface TextConstraintStyle {
  fontColor: Color
  size: number // fraction of cell size
}

export const TEXT_STYLES: Record<string, TextConstraintStyle> = {
  xv:            { fontColor: greyscale(0), size: 0.30 },
  sandwich_sums: { fontColor: greyscale(0), size: 0.65 },
  x_sums:        { fontColor: greyscale(0), size: 0.65 },
  skyscrapers:   { fontColor: greyscale(0), size: 0.65 },
}

// ── Cell background colors ────────────────────────────────────────────────────

export const CELL_BACKGROUND_COLORS: Record<string, Color> = {
  extra_regions:   greyscale(221),
  clone:           greyscale(204),
  row_index_cells: { red: 255, green: 200, blue: 200, opacity: 0.7 },
  col_index_cells: { red: 180, green: 235, blue: 195, opacity: 0.7 },
  // Applied when a single cell is both a row and column index cell.
  row_col_index_cells: { red: 255, green: 245, blue: 170, opacity: 0.7 },
  minimums:        greyscale(240),
  maximums:        greyscale(240),
}

// ── Cage style ────────────────────────────────────────────────────────────────

export const CAGE_STYLE = {
  textColor: greyscale(0),
  cageColor: greyscale(0),
}
