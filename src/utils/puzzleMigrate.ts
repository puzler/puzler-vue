import { cosmeticPos } from '@/types/constraints'
import type {
  ConnectorDot, OuterClue, ConnectorInstance, OuterClueInstance,
  LinePreset, ShapePreset, TextPreset, CellColorPreset, CagePreset,
  ShapeStyle, TextData, ShapeData,
} from '@/types/constraints'
import { buildDocument, PUZZLE_EXPORT_VERSION } from './puzzleExport'
import type { SerializedPuzzle, PuzzleSnapshot } from './puzzleExport'

// Migrates pre-v4 puzzle documents (stored versions from before the backfill,
// saved export files) to the current format. Pure and idempotent: v4 input is
// returned untouched — the version check is the guard that keeps the 1-index
// shift from ever applying twice. The v3 document is normalized into the same
// store-shaped snapshot the live serializer uses, then rendered through the
// shared buildDocument, so a migrated file and a re-serialized store can never
// drift apart.
//
// v1/v2-era blobs (`version` instead of `formatVersion`, sections missing) go
// through the same path — every field reads defensively, matching how the old
// hydrator tolerated them.

// The pre-v4 document shape (v3 field names; all cell keys 0-indexed).
interface V3Document {
  formatVersion?: number
  version?: number
  grid: { rows: number; cols: number; customCellRegions?: Record<string, string | null> | null }
  // (v3 stored one label per cell; the snapshot converts to label lists.)
  meta?: { name?: string; author?: string; rules?: string; solveMessage?: string }
  solution?: Record<string, number> | null
  givenDigits?: Record<string, number>
  activeConstraints?: Array<{ type: string }>
  globals?: { variants?: string[]; custom?: Array<{ type: string; value: number }> }
  constraints?: {
    singleCellMarks?: Record<string, string[]>
    connectorDots?: Record<string, ConnectorDot>
    outerClues?: Record<string, OuterClue>
  }
  cosmetics?: {
    cellColors?: Record<string, string>
    instances?: Array<{ type: string; data: unknown }>
    linePresets?: LinePreset[]
    shapePresets?: Array<{ id: string; label: string; style: Partial<ShapeStyle> & { size?: number } }>
    textPresets?: TextPreset[]
    cellColorPresets?: CellColorPreset[]
    cagePresets?: CagePreset[]
  }
}

export function migratePuzzleDocument(doc: SerializedPuzzle): SerializedPuzzle {
  const raw = doc as unknown as V3Document
  const version = raw.formatVersion ?? raw.version ?? 0
  if (version >= PUZZLE_EXPORT_VERSION) return doc
  return buildDocument(snapshotFromV3(raw))
}

function snapshotFromV3(doc: V3Document): PuzzleSnapshot {
  const meta = doc.meta ?? {}
  const globals = doc.globals ?? {}
  const constraints = doc.constraints ?? {}
  const cosmetics = doc.cosmetics ?? {}

  // Legacy shape preset sizing: a single `size` fraction becomes explicit
  // width/height (sizeLinked is derived on load and dropped from documents).
  const shapePresets: ShapePreset[] = (cosmetics.shapePresets ?? []).map((preset) => {
    const { size, ...style } = preset.style
    const width = style.width ?? size ?? 0.5
    const height = style.height ?? size ?? width
    return {
      id: preset.id,
      label: preset.label,
      style: { ...style, width, height, sizeLinked: width === height } as ShapeStyle,
    }
  })
  const textPresets = cosmetics.textPresets ?? []

  // Legacy text/shape cosmetics: instances used to be pinned to a cell
  // (+ anchor) with shared preset content — resolve each to its own free
  // `pos` and `content` so the document builder sees the modern model.
  const instances = (cosmetics.instances ?? []).map((inst) => {
    if (inst.type !== 'text' && inst.type !== 'shape') return { type: inst.type, data: inst.data }
    const data = inst.data as TextData & ShapeData
    const content = data.content
      ?? (inst.type === 'text' ? (textPresets.find((p) => p.id === data.presetId)?.content ?? '?') : '')
    return {
      type: inst.type,
      data: {
        presetId: data.presetId,
        pos: cosmeticPos(data),
        content,
        ...(data.rotation ? { rotation: data.rotation } : {}),
      },
    }
  })

  const connectorDots: Array<Pick<ConnectorInstance, 'type' | 'location' | 'value'>> =
    Object.entries(constraints.connectorDots ?? {}).map(([location, dot]) => ({
      type: dot.type, location, value: dot.value,
    }))
  const outerClues: Array<Pick<OuterClueInstance, 'type' | 'location' | 'value' | 'direction' | 'rossiniDirection'>> =
    Object.entries(constraints.outerClues ?? {}).map(([location, clue]) => ({
      type: clue.type, location, value: clue.value,
      direction: clue.direction, rossiniDirection: clue.rossiniDirection,
    }))

  return {
    rows: doc.grid.rows,
    cols: doc.grid.cols,
    // An explicit digit range did not exist before v4.
    digits: null,
    // v3 held one label (or null) per cell; the store now keeps label lists.
    customCellRegions: doc.grid.customCellRegions
      ? Object.fromEntries(
          Object.entries(doc.grid.customCellRegions).map(([key, label]) => [key, label === null ? [] : [label]]),
        )
      : null,
    meta: {
      name: meta.name ?? '',
      author: meta.author ?? '',
      rules: meta.rules ?? '',
      solveMessage: meta.solveMessage ?? '',
    },
    solution: doc.solution ?? null,
    givenDigits: doc.givenDigits ?? {},
    // Pre-v4 puzzles are always sudoku: add the Sudoku Rules chip, whose
    // document presence is what now means "sudoku rules apply".
    activeTypes: new Set([...(doc.activeConstraints ?? []).map((c) => c.type), 'sudoku_rules']),
    variants: new Set(globals.variants ?? []),
    sudokuRulesEnabled: true,
    customGlobals: (globals.custom ?? []).map((c) => ({ type: c.type, value: c.value })),
    // Fog solver helpers did not exist before v4.
    fogSolverHelpers: {},
    singleCellMarks: Object.fromEntries(
      Object.entries(constraints.singleCellMarks ?? {}).map(([type, cells]) => [type, [...cells].sort()]),
    ),
    // Per-instance setter colors did not exist before v4.
    singleCellMarkColors: {},
    connectorDots,
    outerClues,
    instances,
    cellColors: cosmetics.cellColors ?? {},
    presets: {
      cosmetic_line: cosmetics.linePresets ?? [],
      // Cosmetic borders did not exist before v4.
      cosmetic_border: [],
      shape: shapePresets,
      text: textPresets,
      cell_color: cosmetics.cellColorPresets ?? [],
      cosmetic_cage: cosmetics.cagePresets ?? [],
    },
  }
}
