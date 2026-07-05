import type { SerializedPuzzle, SerializedPreset } from '@/utils/puzzleExport'
import type { LittleKillerDirection, RossiniDirection, XvValue, InequalityValue, ShapeType } from '@/types/constraints'

// Schema-generation-only types: `npm run schema:puzzle` points
// ts-json-schema-generator at SerializedPuzzleSchema to produce the JSON
// Schema behind the raw JSON editor's autocomplete/hover. Nothing at runtime
// imports this file.
//
// The document (format v4) is 1-indexed (`r1c1` = top-left; the outer clue
// ring is `r0`/`r{rows+1}`). Every constraint type is its own camelCase key —
// key presence means the constraint is active, even with an empty entry.
//
// The mirror enumerates keys explicitly because the generator cannot resolve
// the registry's runtime maps. The type-level guards at the bottom catch
// top-level drift against the real SerializedPuzzle; the per-key lists are
// pinned against TYPE_TO_JSON_KEY by schemaTypes.test.ts (which reads the
// GENERATED puzzle-schema.json, so it validates the full pipeline — adding a
// constraint type means: registry `json.key`, a line here, `npm run
// schema:puzzle`).

// ── Per-shape document forms ─────────────────────────────────────────────────

export interface LineDoc {
  cells: string[]
}

export interface ThermometerDoc {
  bulb: string
  // Each line is a cell path starting at the bulb or at a branch point.
  lines: string[][]
}

export interface ArrowDoc {
  bulbCells: string[]
  arrows: string[][]
}

export interface KillerCageDoc {
  cells: string[]
  sum?: number
}

export interface CloneDoc {
  cells: string[]
  copies: Array<{ dRow: number; dCol: number }>
}

export interface DotDoc {
  // Exactly two orthogonally adjacent cells.
  cells: string[]
  value?: number
}

export interface XvDoc {
  cells: string[]
  value?: XvValue
}

export interface InequalityDoc {
  cells: string[]
  value?: InequalityValue
}

export interface QuadrupleDoc {
  // The 2×2 block of cells sharing the corner, in reading order.
  cells: string[]
  values: number[]
}

export interface OuterClueDoc {
  // A ring cell: r0/r{rows+1} rows or c0/c{cols+1} columns.
  cell: string
  value?: number
}

export interface LittleKillerDoc {
  cell: string
  value?: number
  direction?: LittleKillerDirection
}

export interface RossiniDoc {
  cell: string
  direction?: RossiniDirection
}

export interface CosmeticLineDoc {
  cells: string[]
  preset?: string
}

export interface CosmeticCageDoc {
  cells: string[]
  sum?: number
  preset?: string
}

export interface FreeCosmeticDoc {
  // Free position in cell units: r1c1's centre is { x: 1.5, y: 1.5 };
  // half-steps land on edges and corners, values outside the grid are fine.
  pos: { x: number; y: number }
  content?: string
  rotation?: number
  preset?: string
}

export interface StyledPresetDoc {
  id: string
  label?: string
  style: Record<string, unknown>
}

export interface ShapePresetDoc {
  id: string
  label?: string
  style: {
    shapeType: ShapeType
    fillColor: string
    strokeColor: string
    strokeWidth: number
    width: number
    height: number
    rotation?: number
    textColor: string
    textSize: number
  }
}

export interface ColorPresetDoc {
  id: string
  label?: string
  color: string
}

// ── The document ─────────────────────────────────────────────────────────────

export interface SerializedPuzzleSchema {
  formatVersion: number
  grid: {
    rows: number
    cols: number
    // Region label → complete cell list. Omitted = standard boxes; when
    // present it IS the whole layout and unlisted cells belong to no region.
    regions?: Record<string, string[]>
  }
  meta?: {
    name?: string
    author?: string
    rules?: string
    solveMessage?: string
  }
  solution?: Record<string, number> | null
  givenDigits?: Record<string, number>
  globals?: {
    diagonals?: { positive?: boolean; negative?: boolean; antiPositive?: boolean; antiNegative?: boolean }
    chess?: { king?: boolean; knight?: boolean }
    antiKropki?: { white?: boolean; black?: boolean; differences?: number[]; ratios?: number[] }
    antiXv?: { x?: boolean; v?: boolean; sums?: number[] }
    disjointSets?: { enabled?: boolean }
  }
  constraints?: {
    renbanLines?: LineDoc[]
    germanWhispers?: LineDoc[]
    dutchWhispers?: LineDoc[]
    palindromes?: LineDoc[]
    regionSumLines?: LineDoc[]
    entropicLines?: LineDoc[]
    modularLines?: LineDoc[]
    nabnerLines?: LineDoc[]
    zipperLines?: LineDoc[]
    betweenLines?: LineDoc[]
    lockoutLines?: LineDoc[]
    thermometers?: ThermometerDoc[]
    slowThermometers?: ThermometerDoc[]
    arrows?: ArrowDoc[]
    differenceDots?: DotDoc[]
    ratioDots?: DotDoc[]
    xv?: XvDoc[]
    inequalities?: InequalityDoc[]
    quadruples?: QuadrupleDoc[]
    oddCells?: string[]
    evenCells?: string[]
    minimums?: string[]
    maximums?: string[]
    countingCircles?: string[]
    rowIndexCells?: string[]
    colIndexCells?: string[]
    killerCages?: KillerCageDoc[]
    extraRegions?: LineDoc[]
    clones?: CloneDoc[]
    xSums?: OuterClueDoc[]
    sandwichSums?: OuterClueDoc[]
    skyscrapers?: OuterClueDoc[]
    littleKillers?: LittleKillerDoc[]
    numberedRooms?: OuterClueDoc[]
    battlefield?: OuterClueDoc[]
    nextToNine?: OuterClueDoc[]
    rossini?: RossiniDoc[]
  }
  cosmetics?: {
    lines?: CosmeticLineDoc[]
    linePresets?: StyledPresetDoc[]
    cellColors?: Record<string, string>
    cellColorPresets?: ColorPresetDoc[]
    shapes?: FreeCosmeticDoc[]
    shapePresets?: ShapePresetDoc[]
    texts?: FreeCosmeticDoc[]
    textPresets?: StyledPresetDoc[]
    cages?: CosmeticCageDoc[]
    cagePresets?: StyledPresetDoc[]
  }
}

// Compile-time drift guards against the real export's top level. The
// constraints/cosmetics sections are open Records at runtime, so their key
// lists are pinned by schemaTypes.test.ts against the registry instead.
type AssertNever<T extends never> = T
type KeysDiff<A, B> = Exclude<keyof A, keyof B> | Exclude<keyof B, keyof A>
export type _GuardTopLevel = AssertNever<KeysDiff<SerializedPuzzle, SerializedPuzzleSchema>>
export type _GuardGrid = AssertNever<KeysDiff<SerializedPuzzle['grid'], NonNullable<SerializedPuzzleSchema['grid']>>>
export type _GuardMeta = AssertNever<KeysDiff<NonNullable<SerializedPuzzle['meta']>, NonNullable<SerializedPuzzleSchema['meta']>>>
export type _GuardPreset = AssertNever<KeysDiff<SerializedPreset, StyledPresetDoc & ColorPresetDoc>>
