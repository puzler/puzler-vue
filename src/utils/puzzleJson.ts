import { parser as jsonParser } from '@lezer/json'
import type { SyntaxNode } from '@lezer/common'
import type { useEditorStore } from '@/stores/editor'
import type { useGridStore } from '@/stores/grid'
import { serializePuzzle, hydratePuzzle } from './puzzleExport'
import type { SerializedPuzzle } from './puzzleExport'
import { resizeDocument, type ResizeSide } from './resizeDocument'

type EditorStore = ReturnType<typeof useEditorStore>
type GridStore = ReturnType<typeof useGridStore>

// The text the raw JSON editor shows: the full export (solution and solve
// message included — the document is setter-owned), pretty-printed.
export function formatPuzzleJson(editor: EditorStore, grid: GridStore): string {
  return JSON.stringify(serializePuzzle(editor, grid), null, 2)
}

export type ApplyResult = { ok: true } | { ok: false; error: string }

// Applies an edited document to the stores as ONE undoable step: a closure
// command holding before/after whole-puzzle snapshots. resetPuzzleState (not
// reset) keeps the undo history alive; authorDifficulty and solutionCode are
// store state outside the export that the reset would wipe, so they ride
// across the swap.
//
// The first apply runs guarded: if hydration throws partway (hand-edited data
// the validator didn't anticipate), the before-snapshot — which came from the
// stores, so it always hydrates — is re-applied and NO history entry is
// recorded, leaving state and undo stack exactly as they were.
export function applyPuzzleJson(editor: EditorStore, grid: GridStore, after: SerializedPuzzle): ApplyResult {
  const before = serializePuzzle(editor, grid)
  const applySnap = (snap: SerializedPuzzle) => {
    const difficulty = editor.authorDifficulty
    const code = editor.solutionCode
    editor.resetPuzzleState()
    hydratePuzzle(editor, grid, snap)
    editor.authorDifficulty = difficulty
    editor.solutionCode = code
  }
  try {
    applySnap(after)
  } catch (e) {
    applySnap(before)
    return { ok: false, error: e instanceof Error ? e.message : 'Could not apply this document.' }
  }
  editor.recordHistory({
    execute: () => applySnap(after),
    undo: () => applySnap(before),
  })
  return { ok: true }
}

// Grid-tool resize: serialize → pure transform → whole-document apply, so an
// add/remove of a row or column (with all its constraint trimming) is exactly
// one undoable step. Bounds match the New Grid modal. 48 covers the known
// gattai shapes (Samurai 21, Sumo 33, Shogun 21×45) with headroom; the
// zoom/pan viewport is what makes boards past ~16 usable.
export const GRID_MIN = 2
export const GRID_MAX = 48

export function resizePuzzleGrid(
  editor: EditorStore,
  grid: GridStore,
  side: ResizeSide,
  delta: 1 | -1,
): ApplyResult {
  const axis = side === 'top' || side === 'bottom' ? grid.rows : grid.cols
  const next = axis + delta
  if (next < GRID_MIN || next > GRID_MAX) {
    return { ok: false, error: `Grid dimensions stay between ${GRID_MIN} and ${GRID_MAX}.` }
  }
  const result = applyPuzzleJson(editor, grid, resizeDocument(serializePuzzle(editor, grid), side, delta))
  // The document swap resets the active tool; stay in the Grid tool so the
  // on-canvas +/- controls survive consecutive clicks.
  if (result.ok) editor.setActiveTool('grid')
  return result
}

// Resolves a validation issue path ("constraints.arrows[0].arrows") to a
// 1-based line number in the buffer text, so errors in a large document are
// findable. Walks the lezer JSON tree segment by segment; when a segment can't
// be matched (path from a migrated view of a pasted old document, or a key the
// buffer doesn't have), it returns the line of the deepest node it reached —
// close is still useful. Null only when the text isn't the parsed document.
const VALUE_NODES = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null'])

export function lineForIssuePath(text: string, path: string): number | null {
  // "a.b[2].c" → ['a', 'b', 2, 'c']; keys never contain dots or brackets.
  const segments: Array<string | number> = []
  for (const part of path.split('.')) {
    const m = /^([^[]*)((?:\[\d+\])*)$/.exec(part)
    if (!m) return null
    if (m[1]) segments.push(m[1])
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) segments.push(Number(idx[1]))
  }

  let node: SyntaxNode | null = jsonParser.parse(text).topNode.firstChild
  let deepest = node
  for (const segment of segments) {
    if (!node) break
    let next: SyntaxNode | null = null
    if (typeof segment === 'number') {
      if (node.name !== 'Array') break
      // Children include the anonymous bracket/comma tokens; only named value
      // nodes count toward the index.
      let i = 0
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (!VALUE_NODES.has(child.name)) continue
        if (i === segment) {
          next = child
          break
        }
        i++
      }
    } else {
      if (node.name !== 'Object') break
      for (let prop = node.firstChild; prop; prop = prop.nextSibling) {
        if (prop.name !== 'Property') continue
        const nameNode = prop.firstChild
        if (!nameNode) continue
        let key: unknown
        try {
          key = JSON.parse(text.slice(nameNode.from, nameNode.to))
        } catch {
          continue
        }
        if (key === segment) {
          next = prop.lastChild
          deepest = prop
          break
        }
      }
    }
    if (!next) break
    node = next
    deepest = next
  }
  if (!deepest) return null
  // Line number = 1 + newlines before the node.
  let line = 1
  for (let i = 0; i < deepest.from; i++) {
    if (text.charCodeAt(i) === 10) line++
  }
  return line
}

// A quoted 6- or 8-digit hex color in JSON text; from/to span the quotes so
// callers can place widgets beside the value or rewrite just its interior.
export interface HexColorMatch {
  from: number
  to: number
  color: string
}

// Finds "#rrggbb" and "#rrggbbaa" string values for the inline color-swatch
// widgets. Shorthand #rgb and values like "none" are simply left undecorated.
const HEX_COLOR_RE = /"(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)"/g

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
