import type { SerializedPuzzle } from '@/utils/puzzleExport'
import type { ActiveConstraint } from '@/stores/editor'
import type {
  ArrowData,
  CagePreset,
  CellColorPreset,
  CloneData,
  ConnectorDot,
  ConstraintLineData,
  CosmeticCageData,
  CosmeticLineData,
  CustomGlobalConstraint,
  ExtraRegionData,
  KillerCageData,
  LinePreset,
  OuterClue,
  ShapeData,
  ShapePreset,
  TextData,
  TextPreset,
  ThermometerData,
} from '@/types/constraints'

// Schema-generation-only types: `npm run schema:puzzle` points
// ts-json-schema-generator at SerializedPuzzleSchema to produce the JSON
// Schema behind the raw JSON editor's autocomplete/hover. Nothing at runtime
// imports this file.
//
// The shape mirrors SerializedPuzzle rather than deriving from it because the
// generator cannot resolve ReturnType-based types; the Assert guards at the
// bottom make vue-tsc fail if the mirror's keys drift from the real export.
// Fields are optional here because compactExport prunes empty sections — the
// schema should not claim they're required.

// CosmeticInstance.data is `unknown` in app code, which would leave
// autocomplete silent inside a cosmetic's `data` — so this union narrows it to
// the known shapes. A new constraint type with its own instance data needs a
// line added here (see the adding-a-constraint checklist).
export type KnownCosmeticData =
  | ThermometerData
  | ArrowData
  | ConstraintLineData
  | CosmeticLineData
  | KillerCageData
  | ExtraRegionData
  | CloneData
  | ShapeData
  | TextData
  | CosmeticCageData

interface SchemaCosmeticInstance {
  id: string
  type: string
  data: KnownCosmeticData
}

export interface SerializedPuzzleSchema {
  formatVersion: number
  grid: {
    rows: number
    cols: number
    customCellRegions?: Record<string, string | null> | null
  }
  meta?: {
    name?: string
    author?: string
    rules?: string
    solveMessage?: string
  }
  solution?: Record<string, number> | null
  givenDigits?: Record<string, number>
  activeConstraints?: ActiveConstraint[]
  globals?: {
    variants?: string[]
    custom?: CustomGlobalConstraint[]
  }
  constraints?: {
    singleCellMarks?: Record<string, string[]>
    connectorDots?: Record<string, ConnectorDot>
    outerClues?: Record<string, OuterClue>
  }
  cosmetics?: {
    cellColors?: Record<string, string>
    instances?: SchemaCosmeticInstance[]
    linePresets?: LinePreset[]
    shapePresets?: ShapePreset[]
    textPresets?: TextPreset[]
    cellColorPresets?: CellColorPreset[]
    cagePresets?: CagePreset[]
  }
}

// Compile-time drift guards: if a key is added to or removed from the real
// export (top level or any section) without updating the mirror above, these
// resolve to a non-never type and vue-tsc fails.
type AssertNever<T extends never> = T
type KeysDiff<A, B> = Exclude<keyof A, keyof B> | Exclude<keyof B, keyof A>
export type _GuardTopLevel = AssertNever<KeysDiff<SerializedPuzzle, SerializedPuzzleSchema>>
export type _GuardGrid = AssertNever<KeysDiff<SerializedPuzzle['grid'], NonNullable<SerializedPuzzleSchema['grid']>>>
export type _GuardMeta = AssertNever<KeysDiff<SerializedPuzzle['meta'], NonNullable<SerializedPuzzleSchema['meta']>>>
export type _GuardGlobals = AssertNever<KeysDiff<SerializedPuzzle['globals'], NonNullable<SerializedPuzzleSchema['globals']>>>
export type _GuardConstraints = AssertNever<KeysDiff<SerializedPuzzle['constraints'], NonNullable<SerializedPuzzleSchema['constraints']>>>
export type _GuardCosmetics = AssertNever<KeysDiff<SerializedPuzzle['cosmetics'], NonNullable<SerializedPuzzleSchema['cosmetics']>>>
