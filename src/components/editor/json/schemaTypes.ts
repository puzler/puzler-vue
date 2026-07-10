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
//
// Per-instance setter colors: every local constraint instance accepts an
// optional `color` (6 or 8 digit hex; 8 = alpha); multi-element types add
// specific fields that beat `color` for their element. The canonical field
// list is INSTANCE_COLOR_FIELDS in the constraint registry.

// ── Per-shape document forms ─────────────────────────────────────────────────

export interface LineDoc {
  cells: string[]
  /**
   * Paints this instance. 6 or 8 digit hex; 8 adds transparency.
   * @example "#8b2be2"
   * @example "#8b2be280"
   */
  color?: string
}

export interface BetweenLineDoc {
  cells: string[]
  /**
   * Paints the line and the end bulbs' fill. The bulb outline keeps its
   * default unless bulbOutlineColor is set. 6 or 8 digit hex.
   * @example "#8b2be2"
   */
  color?: string
  /** Recolors just the line stroke. */
  lineColor?: string
  /** Recolors just the end bulbs'/diamonds' fill. */
  bulbFillColor?: string
  /** Recolors just the end bulbs'/diamonds' outline. */
  bulbOutlineColor?: string
}

export interface ThermometerDoc {
  bulb: string
  // Each line is a cell path starting at the bulb or at a branch point.
  lines: string[][]
  /**
   * Paints the bulb and the tube. 6 or 8 digit hex; 8 adds transparency.
   * @example "#2b7de2"
   */
  color?: string
  /** Recolors just the bulb. */
  bulbColor?: string
  /** Recolors just the tube. */
  lineColor?: string
}

export interface ArrowDoc {
  bulbCells: string[]
  arrows: string[][]
  /**
   * Paints the bulb outline and the arrows. The bulb interior stays
   * transparent unless bulbFillColor is set. 6 or 8 digit hex.
   * @example "#2b7de2"
   */
  color?: string
  /** Fills the bulb interior (transparent by default). */
  bulbFillColor?: string
  /** Recolors just the bulb outline. */
  bulbStrokeColor?: string
  /** Recolors just the arrow shafts and heads. */
  arrowColor?: string
}

export interface KillerCageDoc {
  cells: string[]
  sum?: number
  /**
   * Paints the cage outline and the sum text. 6 or 8 digit hex.
   * @example "#0a8a4a"
   */
  color?: string
  /** Recolors just the dashed cage outline. */
  cageColor?: string
  /** Recolors just the sum text. */
  textColor?: string
}

export interface CloneDoc {
  cells: string[]
  copies: Array<{ dRow: number; dCol: number }>
  /**
   * Tints the original and copy cells. 6 or 8 digit hex.
   * @example "#cccccc80"
   */
  color?: string
}

export interface DotDoc {
  // Exactly two orthogonally adjacent cells.
  cells: string[]
  value?: number
  /**
   * Recolors the dot fill; outline and value text keep their defaults unless
   * outlineColor/textColor are set. 6 or 8 digit hex.
   * @example "#e2a72b"
   */
  color?: string
  /** Recolors just the dot fill. */
  fillColor?: string
  /** Recolors just the dot outline. */
  outlineColor?: string
  /** Recolors just the value text. */
  textColor?: string
}

export interface XvDoc {
  cells: string[]
  value?: XvValue
  /**
   * Recolors the glyph. 6 or 8 digit hex.
   * @example "#333333"
   */
  color?: string
}

export interface InequalityDoc {
  cells: string[]
  value?: InequalityValue
  /** Recolors the sign. 6 or 8 digit hex. */
  color?: string
}

export interface QuadrupleDoc {
  // The 2×2 block of cells sharing the corner, in reading order.
  cells: string[]
  values: number[]
  /**
   * Recolors the circle fill; outline and digits keep their defaults unless
   * outlineColor/textColor are set. 6 or 8 digit hex.
   * @example "#f5f5dc"
   */
  color?: string
  /** Recolors just the circle fill. */
  fillColor?: string
  /** Recolors just the circle outline. */
  outlineColor?: string
  /** Recolors just the digits. */
  textColor?: string
}

export interface OuterClueDoc {
  // A ring cell: r0/r{rows+1} rows or c0/c{cols+1} columns.
  cell: string
  value?: number
  /**
   * Recolors the clue text. 6 or 8 digit hex.
   * @example "#555555"
   */
  color?: string
}

export interface LittleKillerDoc {
  cell: string
  value?: number
  direction?: LittleKillerDirection
  /**
   * Paints the clue text and the diagonal arrow. 6 or 8 digit hex.
   * @example "#555555"
   */
  color?: string
  /** Recolors just the clue text. */
  textColor?: string
  /** Recolors just the diagonal arrow. */
  arrowColor?: string
}

export interface RossiniDoc {
  cell: string
  direction?: RossiniDirection
  /** Recolors the arrow. 6 or 8 digit hex. */
  color?: string
}

// ── Single-cell marks ────────────────────────────────────────────────────────
// A mark is the plain cell key, or the object form to carry setter colors.

export interface CellMarkDoc {
  cell: string
  /**
   * Paints the mark. 6 or 8 digit hex; 8 adds transparency.
   * @example "#b0b0b080"
   */
  color?: string
}

export interface MinMaxMarkDoc {
  cell: string
  /**
   * Tints the cell background; the chevrons keep their default unless
   * chevronColor is set. 6 or 8 digit hex.
   * @example "#e0f0ff"
   */
  color?: string
  /** Tints just the cell background. */
  backgroundColor?: string
  /** Recolors just the chevrons. */
  chevronColor?: string
}

export interface CountingCircleMarkDoc {
  cell: string
  /**
   * Recolors the circle fill; the outline keeps its default unless
   * outlineColor is set. 6 or 8 digit hex.
   * @example "#ffd70080"
   */
  color?: string
  /** Recolors just the circle fill. */
  fillColor?: string
  /** Recolors just the circle outline. */
  outlineColor?: string
}

// ── Cosmetics ────────────────────────────────────────────────────────────────

export interface CosmeticLineDoc {
  cells: string[]
  preset?: string
}

export interface CosmeticBorderDoc {
  /** Each edge is the pair of adjacent cells it separates, e.g. ["r1c1", "r1c2"]. */
  edges: string[][]
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

export interface LinePresetDoc {
  id: string
  label?: string
  style: {
    color: string
    strokeWidth: number
    /** 0 (invisible) to 1 (opaque). */
    opacity?: number
  }
}

export interface TextPresetDoc {
  id: string
  label?: string
  style: {
    color: string
    fontSize: number
    bold?: boolean
    rotation?: number
    /** Text opacity, 0 (invisible) to 1 (opaque). */
    opacity?: number
  }
}

export interface CagePresetDoc {
  id: string
  label?: string
  style: {
    cageColor: string
    textColor: string
    /** Cage outline opacity, 0 (invisible) to 1 (opaque). */
    cageOpacity?: number
    /** Sum text opacity, 0 (invisible) to 1 (opaque). */
    textOpacity?: number
  }
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
    /** Fill opacity, 0 (invisible) to 1 (opaque). */
    fillOpacity?: number
    /** Outline opacity, 0 (invisible) to 1 (opaque). */
    strokeOpacity?: number
    /** Inner-text opacity, 0 (invisible) to 1 (opaque). */
    textOpacity?: number
  }
}

export interface ColorPresetDoc {
  id: string
  label?: string
  color: string
  /** Cell fill opacity, 0 (invisible) to 1 (opaque). */
  opacity?: number
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
    sudokuRules?: { enabled?: boolean }
    diagonals?: { positive?: boolean; negative?: boolean; antiPositive?: boolean; antiNegative?: boolean }
    chess?: { king?: boolean; knight?: boolean }
    antiKropki?: { white?: boolean; black?: boolean; differences?: number[]; ratios?: number[] }
    antiXv?: { x?: boolean; v?: boolean; sums?: number[] }
    disjointSets?: { enabled?: boolean }
    fog?: { enabled?: boolean }
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
    betweenLines?: BetweenLineDoc[]
    lockoutLines?: BetweenLineDoc[]
    thermometers?: ThermometerDoc[]
    slowThermometers?: ThermometerDoc[]
    arrows?: ArrowDoc[]
    differenceDots?: DotDoc[]
    ratioDots?: DotDoc[]
    xv?: XvDoc[]
    inequalities?: InequalityDoc[]
    quadruples?: QuadrupleDoc[]
    oddCells?: Array<string | CellMarkDoc>
    evenCells?: Array<string | CellMarkDoc>
    minimums?: Array<string | MinMaxMarkDoc>
    maximums?: Array<string | MinMaxMarkDoc>
    countingCircles?: Array<string | CountingCircleMarkDoc>
    rowIndexCells?: Array<string | CellMarkDoc>
    colIndexCells?: Array<string | CellMarkDoc>
    fogLights?: Array<string | CellMarkDoc>
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
    linePresets?: LinePresetDoc[]
    borders?: CosmeticBorderDoc[]
    borderPresets?: LinePresetDoc[]
    cellColors?: Record<string, string>
    cellColorPresets?: ColorPresetDoc[]
    shapes?: FreeCosmeticDoc[]
    shapePresets?: ShapePresetDoc[]
    texts?: FreeCosmeticDoc[]
    textPresets?: TextPresetDoc[]
    cages?: CosmeticCageDoc[]
    cagePresets?: CagePresetDoc[]
  }
  // Setter-declared rules-text facts the fog-of-war solver may exploit —
  // declarations about the puzzle's construction, not constraints. They change
  // nothing outside the solver's fog reasoning. Only meaningful with fog.
  solverHelpers?: {
    arrows?: {
      /** Every arrow bulb is exactly one cell (arrows sum to a single digit). */
      singleCellBulbs?: boolean
      /** No two arrows share a cell (arrowhead tips may still coincide). */
      noCrossings?: boolean
      /** Every bulb has exactly one arrow (declaration only; no deduction yet). */
      oneArrowPerBulb?: boolean
    }
    killerCages?: {
      /** Opt-out: do NOT assume cage cells are orthogonally connected. */
      maybeDisconnected?: boolean
    }
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
