// Shared logic for a collection's interleaved entry list (puzzles + story
// pages), used by the viewer flow and the table of contents.

export type FlowEntry = {
  id: string
  entryType: string
  // Per-viewer state resolved by the server (absent in older payloads/tests).
  locked?: boolean
  solved?: boolean
  gated?: boolean
  hidden?: boolean
  finale?: boolean
  storyTitle?: string | null
  puzzle?: { id: string } | null
  storyPage?: { id: string; title?: string | null; bodyHtml?: string | null } | null
}

function puzzleSolved(entry: FlowEntry, localSolved: Set<string>): boolean {
  return entry.solved === true || (entry.puzzle != null && localSolved.has(entry.puzzle.id))
}

// In a sequence collection, an entry unlocks only once every earlier puzzle is
// solved; story pages never block anything themselves. Unordered collections
// are always fully open (gating is strictly an author opt-in).
export function entryUnlocked(
  entries: FlowEntry[], index: number, isSequence: boolean, solved: Set<string>,
): boolean {
  if (!isSequence) return true
  return entries.slice(0, index).every(
    (entry) => entry.entryType !== 'Puzzle' || puzzleSolved(entry, solved),
  )
}

// What the viewer may open right now. The server's per-actor lock is
// authoritative for gates (codewords, finales); a plain sequence lock may be
// overridden by local solve history (e.g. guests who solved puzzles before
// their guest token existed).
export function entryOpen(
  entries: FlowEntry[], index: number, isSequence: boolean, localSolved: Set<string>,
): boolean {
  const entry = entries[index]
  if (entry.locked === undefined) return entryUnlocked(entries, index, isSequence, localSolved)
  if (!entry.locked) return true
  if (entry.gated || entry.finale) return false
  return entryUnlocked(entries, index, isSequence, localSolved)
}

export function entrySolved(entry: FlowEntry, localSolved: Set<string>): boolean {
  return entry.entryType === 'Puzzle' && puzzleSolved(entry, localSolved)
}

// 1-based number of the puzzle at `index` counting puzzle entries only, so
// story pages never shift the puzzle numbering.
export function puzzleOrdinal(entries: FlowEntry[], index: number): number {
  return entries.slice(0, index + 1).filter((e) => e.entryType === 'Puzzle').length
}

// Titled story entries form the table of contents; untitled interludes don't.
// Locked chapters keep their title (the server still sends storyTitle).
export function tableOfContents(
  entries: FlowEntry[], isSequence: boolean, solved: Set<string>,
): { id: string; title: string; unlocked: boolean }[] {
  return entries.flatMap((entry, index) => {
    if (entry.entryType !== 'StoryPage') return []
    const title = entry.storyTitle ?? entry.storyPage?.title
    if (!title) return []
    return [ { id: entry.id, title, unlocked: entryOpen(entries, index, isSequence, solved) } ]
  })
}
