import { describe, it, expect } from 'vitest'
import { entryUnlocked, entryOpen, entrySolved, puzzleOrdinal, tableOfContents, type FlowEntry } from './collectionEntries'

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

  it('uses the server storyTitle for locked chapters whose body is withheld', () => {
    const locked: FlowEntry = { id: 'e-x', entryType: 'StoryPage', locked: true, gated: true, storyTitle: 'Sealed' }
    expect(tableOfContents([ locked ], false, new Set())).toEqual([
      { id: 'e-x', title: 'Sealed', unlocked: false },
    ])
  })
})

describe('entryOpen', () => {
  it('falls back to local logic when the server sent no lock state', () => {
    expect(entryOpen(ENTRIES, 3, true, new Set([ 'p1' ]))).toBe(true)
    expect(entryOpen(ENTRIES, 3, true, new Set())).toBe(false)
  })

  it('trusts an explicit server unlock', () => {
    const entries: FlowEntry[] = [ { ...puzzleEntry('p1'), locked: false } ]
    expect(entryOpen(entries, 0, true, new Set())).toBe(true)
  })

  it('keeps gated and finale locks strict even if local progress disagrees', () => {
    const gated: FlowEntry = { ...storyEntry('s9', 'Vault'), locked: true, gated: true }
    const finale: FlowEntry = { ...puzzleEntry('p9'), locked: true, finale: true }
    expect(entryOpen([ gated ], 0, false, new Set([ 'p1', 'p2' ]))).toBe(false)
    expect(entryOpen([ finale ], 0, false, new Set([ 'p9' ]))).toBe(false)
  })

  it('lets local solve history override a plain sequence lock', () => {
    const entries: FlowEntry[] = [ puzzleEntry('p1'), { ...puzzleEntry('p2'), locked: true } ]
    expect(entryOpen(entries, 1, true, new Set([ 'p1' ]))).toBe(true)
    expect(entryOpen(entries, 1, true, new Set())).toBe(false)
  })

  it('counts server-reported solves toward local sequence checks', () => {
    const entries: FlowEntry[] = [ { ...puzzleEntry('p1'), solved: true }, { ...puzzleEntry('p2'), locked: true } ]
    expect(entryOpen(entries, 1, true, new Set())).toBe(true)
  })
})

describe('entrySolved', () => {
  it('merges local and server solve state, puzzles only', () => {
    expect(entrySolved(puzzleEntry('p1'), new Set([ 'p1' ]))).toBe(true)
    expect(entrySolved({ ...puzzleEntry('p1'), solved: true }, new Set())).toBe(true)
    expect(entrySolved(puzzleEntry('p1'), new Set())).toBe(false)
    expect(entrySolved({ ...storyEntry('s1'), solved: true } as FlowEntry, new Set())).toBe(false)
  })
})
