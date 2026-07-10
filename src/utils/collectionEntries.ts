// Shared logic for a collection's interleaved entry list (puzzles + story
// pages), used by the viewer flow and the table of contents.

export type FlowEntry = {
  id: string
  entryType: string
  puzzle?: { id: string } | null
  storyPage?: { id: string; title?: string | null; bodyHtml?: string | null } | null
}

// In a sequence collection, an entry unlocks only once every earlier puzzle is
// solved; story pages never block anything themselves. Unordered collections
// are always fully open (gating is strictly an author opt-in).
export function entryUnlocked(
  entries: FlowEntry[], index: number, isSequence: boolean, solved: Set<string>,
): boolean {
  if (!isSequence) return true
  return entries.slice(0, index).every(
    (entry) => entry.entryType !== 'Puzzle' || (entry.puzzle != null && solved.has(entry.puzzle.id)),
  )
}

// 1-based number of the puzzle at `index` counting puzzle entries only, so
// story pages never shift the puzzle numbering.
export function puzzleOrdinal(entries: FlowEntry[], index: number): number {
  return entries.slice(0, index + 1).filter((e) => e.entryType === 'Puzzle').length
}

// Titled story entries form the table of contents; untitled interludes don't.
export function tableOfContents(
  entries: FlowEntry[], isSequence: boolean, solved: Set<string>,
): { id: string; title: string; unlocked: boolean }[] {
  return entries.flatMap((entry, index) => {
    if (entry.entryType !== 'StoryPage' || !entry.storyPage?.title) return []
    return [ { id: entry.id, title: entry.storyPage.title, unlocked: entryUnlocked(entries, index, isSequence, solved) } ]
  })
}
