import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'

// Bumped from 1 when constraint state beyond cosmetics (single-cell marks,
// connector dots, outer clues, global variants) joined the export
export const PUZZLE_EXPORT_VERSION = 2

// Serializes the full editor state as a JSON-safe object: everything is
// plain data (Sets become sorted arrays) so the output round-trips through
// JSON.stringify/parse without loss for a future import.
export function serializePuzzle(
  editor: ReturnType<typeof useEditorStore>,
  grid: ReturnType<typeof useGridStore>,
) {
  return {
    version: PUZZLE_EXPORT_VERSION,
    grid: {
      rows: grid.rows,
      cols: grid.cols,
      customCellRegions: grid.customCellRegions,
    },
    meta: {
      name: editor.puzzleName,
      author: editor.puzzleAuthor,
      rules: editor.puzzleRules,
    },
    givenDigits: editor.givenDigits,
    solverCellStates: editor.solverCellStates,
    activeConstraints: editor.activeConstraints,
    globals: {
      variants: Array.from(editor.activeGlobalVariants).sort(),
      custom: editor.customGlobalConstraints,
    },
    constraints: {
      // type → sorted cell keys (Sets in the store)
      singleCellMarks: Object.fromEntries(
        Object.entries(editor.singleCellMarks).map(([type, cells]) => [type, Array.from(cells).sort()]),
      ),
      // border/corner key → { type, value } (difference/ratio dots, XV, quadruples)
      connectorDots: editor.connectorDots,
      // outer ring key → { type, value, direction? } (x-sums, sandwich, skyscrapers, little killers)
      outerClues: editor.outerClues,
    },
    cosmetics: {
      cellColors: editor.cosmeticCellColors,
      instances: editor.cosmeticInstances,
      linePresets: editor.linePresets,
      shapePresets: editor.shapePresets,
      textPresets: editor.textPresets,
      cellColorPresets: editor.cellColorPresets,
      cagePresets: editor.cagePresets,
    },
  }
}
