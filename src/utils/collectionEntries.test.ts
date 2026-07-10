import { describe, it, expect } from 'vitest'
import { entryUnlocked, puzzleOrdinal, tableOfContents, type FlowEntry } from './collectionEntries'

function puzzleEntry(id: string): FlowEntry {
  return { id: `e-${id}`, entryType: 'Puzzle', puzzle: { id } }
}

function storyEntry(id: string, title: string | null = null): FlowEntry {
  return { id: `e-${id}`, entryType: 'StoryPage', storyPage: { id, title, bodyHtml: '<p>x</p>' } }
}

// Prologue, puzzle 1, interlude, puzzle 2, finale.
const ENTRIES: FlowEntry[] = [
  storyEntry('s1', 'Prologue'),
  puzzleEntry('p1'),
  storyEntry('s2'),
  puzzleEntry('p2'),
  storyEntry('s3', 'Finale'),
]

describe('entryUnlocked', () => {
  it('opens everything when the collection is unordered', () => {
    const all = ENTRIES.map((_, i) => entryUnlocked(ENTRIES, i, false, new Set()))
    expect(all).toEqual([ true, true, true, true, true ])
  })

  it('locks entries past the first unsolved puzzle in sequence mode', () => {
    const unlocked = ENTRIES.map((_, i) => entryUnlocked(ENTRIES, i, true, new Set()))
    expect(unlocked).toEqual([ true, true, false, false, false ])
  })

  it('reveals story pages as their preceding puzzles are solved', () => {
    const solved = new Set([ 'p1' ])
    const unlocked = ENTRIES.map((_, i) => entryUnlocked(ENTRIES, i, true, solved))
    expect(unlocked).toEqual([ true, true, true, true, false ])
  })
})

describe('puzzleOrdinal', () => {
  it('numbers puzzles only, unaffected by story pages', () => {
    expect(puzzleOrdinal(ENTRIES, 1)).toBe(1)
    expect(puzzleOrdinal(ENTRIES, 3)).toBe(2)
  })
})

describe('tableOfContents', () => {
  it('lists only titled story entries with their unlock state', () => {
    expect(tableOfContents(ENTRIES, true, new Set([ 'p1' ]))).toEqual([
      { id: 'e-s1', title: 'Prologue', unlocked: true },
      { id: 'e-s3', title: 'Finale', unlocked: false },
    ])
  })
})
