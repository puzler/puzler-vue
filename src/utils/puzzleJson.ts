import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'
import { serializePuzzle, hydratePuzzle } from './puzzleExport'
import type { SerializedPuzzle } from './puzzleExport'

type EditorStore = ReturnType<typeof useEditorStore>
type GridStore = ReturnType<typeof useGridStore>

// The text the raw JSON editor shows: the full export (solution and solve
// message included — the document is setter-owned), pretty-printed.
export function formatPuzzleJson(editor: EditorStore, grid: GridStore): string {
  return JSON.stringify(serializePuzzle(editor, grid), null, 2)
}

// Applies an edited document to the stores as ONE undoable step: a closure
// command holding before/after whole-puzzle snapshots. resetPuzzleState (not
// reset) keeps the undo history alive; authorDifficulty and solutionCode are
// store state outside the export that the reset would wipe, so they ride
// across the swap.
export function applyPuzzleJson(editor: EditorStore, grid: GridStore, after: SerializedPuzzle): void {
  const before = serializePuzzle(editor, grid)
  const applySnap = (snap: SerializedPuzzle) => {
    const difficulty = editor.authorDifficulty
    const code = editor.solutionCode
    editor.resetPuzzleState()
    hydratePuzzle(editor, grid, snap)
    editor.authorDifficulty = difficulty
    editor.solutionCode = code
  }
  editor.pushHistory({
    execute: () => applySnap(after),
    undo: () => applySnap(before),
  })
}

// A quoted 6-digit hex color in JSON text; from/to span the quotes so callers
// can place widgets beside the value or rewrite just its interior.
export interface HexColorMatch {
  from: number
  to: number
  color: string
}

// Finds "#rrggbb" string values for the inline color-swatch widgets. Only the
// 6-digit form: the native color input can't represent #rgb or #rrggbbaa, and
// values like "none" are simply left undecorated.
const HEX_COLOR_RE = /"(#[0-9a-fA-F]{6})"/g

export function scanHexColors(text: string, offset = 0): HexColorMatch[] {
  const matches: HexColorMatch[] = []
  for (const m of text.matchAll(HEX_COLOR_RE)) {
    matches.push({ from: offset + m.index, to: offset + m.index + m[0].length, color: m[1] })
  }
  return matches
}

// How the editor buffer relates to the live puzzle: `baseline` is the store
// text the buffer was last seeded from, `store` the store's text now.
// dirty = the user edited the buffer; behind = the store moved on (grid tools
// used while the panel is open). dirty-behind is the conflict case the panel
// surfaces as a banner instead of clobbering the user's edits.
export type BufferStatus = 'synced' | 'dirty' | 'behind' | 'dirty-behind'

export function bufferStatus(buffer: string, baseline: string, store: string): BufferStatus {
  const dirty = buffer !== baseline
  const behind = store !== baseline
  if (dirty && behind) return 'dirty-behind'
  if (dirty) return 'dirty'
  if (behind) return 'behind'
  return 'synced'
}
