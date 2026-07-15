import { describe, it, expect } from 'vitest'
import { seriesFeedRows, patronFeedRows, mergeFeeds } from './feedMerge'

describe('feedMerge', () => {
  it('normalizes series entries with container share tokens', () => {
    const rows = seriesFeedRows([
      {
        id: '1', entryType: 'Puzzle', releasedAt: '2026-07-10T00:00:00Z', seriesTitle: 'Weekly',
        puzzle: { id: 'p1', title: 'Monday', shareToken: 'tok' },
      },
      {
        id: '2', entryType: 'Collection', releasedAt: '2026-07-09T00:00:00Z', seriesTitle: 'Weekly',
        collection: { id: 'c1', title: 'Pack' },
      },
    ])

    expect(rows[0]).toMatchObject({
      kind: 'puzzle', title: 'Monday', sourceLabel: 'Weekly', patron: false,
      link: { name: 'puzzle', params: { id: 'p1' }, query: { t: 'tok' } },
    })
    expect(rows[1]).toMatchObject({ kind: 'collection', link: { name: 'collection', params: { id: 'c1' }, query: {} } })
  })

  it('labels patron releases with the creator and locked state', () => {
    const rows = patronFeedRows([
      {
        __typename: 'Puzzle', id: 'p9', title: 'Patron special', effectiveReleaseAt: '2026-07-11T00:00:00Z',
        author: { username: 'ann', displayName: 'Ann' }, patronAccess: { hasAccess: false },
      },
      {
        __typename: 'Collection', id: 'c9', title: 'Patron pack', effectiveReleaseAt: '2026-07-12T00:00:00Z',
        author: { username: 'ann', displayName: 'Ann' }, patronAccess: { hasAccess: true },
      },
    ])

    expect(rows[0]).toMatchObject({
      kind: 'puzzle', patron: true, locked: true, sourceLabel: 'Patron release · Ann',
    })
    expect(rows[1]).toMatchObject({ kind: 'collection', locked: false })
  })

  it('merges both sources newest first', () => {
    const merged = mergeFeeds(
      seriesFeedRows([
        { id: '1', entryType: 'Puzzle', releasedAt: '2026-07-10T00:00:00Z', seriesTitle: 'S', puzzle: { id: 'a', title: 'Old' } },
      ]),
      patronFeedRows([
        { __typename: 'Puzzle', id: 'b', title: 'New', effectiveReleaseAt: '2026-07-12T00:00:00Z', patronAccess: { hasAccess: true } },
      ]),
    )

    expect(merged.map((r) => r.title)).toEqual([ 'New', 'Old' ])
  })

  it('sorts rows without timestamps last', () => {
    const merged = mergeFeeds(
      seriesFeedRows([
        { id: '1', entryType: 'Puzzle', releasedAt: null, seriesTitle: 'S', puzzle: { id: 'a', title: 'Undated' } },
      ]),
      patronFeedRows([
        { __typename: 'Puzzle', id: 'b', title: 'Dated', effectiveReleaseAt: '2026-01-01T00:00:00Z' },
      ]),
    )

    expect(merged.map((r) => r.title)).toEqual([ 'Dated', 'Undated' ])
  })
})
