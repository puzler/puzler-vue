// Merge the two Updates-page sources (series releases + patron releases) into
// one normalized, newest-first list. Pure so it's unit-testable; the view owns
// fetching.

export interface FeedRow {
  key: string
  kind: 'puzzle' | 'collection'
  title: string
  // Series title, or "Patron release · Creator" for patron drops.
  sourceLabel: string
  // ISO timestamp used for ordering; empty string sorts last.
  releasedAt: string
  patron: boolean
  locked: boolean
  link: { name: string; params: { id: string }; query: Record<string, string> }
}

interface SeriesFeedItem {
  id: string
  entryType: string
  releasedAt?: string | null
  seriesTitle?: string | null
  puzzle?: { id: string; title: string; shareToken?: string | null } | null
  collection?: { id: string; title: string; shareToken?: string | null } | null
}

interface PatronReleaseItem {
  __typename?: string
  id: string
  title: string
  effectiveReleaseAt?: string | null
  author?: { username: string; displayName: string } | null
  patronAccess?: { hasAccess: boolean } | null
}

export function seriesFeedRows(items: SeriesFeedItem[]): FeedRow[] {
  return items.map((item) => {
    const isCollection = item.entryType === 'Collection'
    const target = isCollection ? item.collection : item.puzzle
    // Container-only targets carry their own share token so they resolve.
    const query: Record<string, string> = target?.shareToken ? { t: target.shareToken } : {}
    return {
      key: `series-${item.id}`,
      kind: isCollection ? 'collection' : 'puzzle',
      title: target?.title ?? (isCollection ? 'Collection' : 'Puzzle'),
      sourceLabel: item.seriesTitle ?? 'Series',
      releasedAt: item.releasedAt ?? '',
      patron: false,
      locked: false,
      link: { name: isCollection ? 'collection' : 'puzzle', params: { id: target?.id ?? '' }, query },
    }
  })
}

export function patronFeedRows(items: PatronReleaseItem[]): FeedRow[] {
  return items.map((item) => {
    const isCollection = item.__typename === 'Collection'
    const creator = item.author?.displayName || item.author?.username || 'a creator'
    return {
      key: `patron-${item.__typename}-${item.id}`,
      kind: isCollection ? 'collection' : 'puzzle',
      title: item.title,
      sourceLabel: `Patron release · ${creator}`,
      releasedAt: item.effectiveReleaseAt ?? '',
      patron: true,
      locked: item.patronAccess ? !item.patronAccess.hasAccess : false,
      link: { name: isCollection ? 'collection' : 'puzzle', params: { id: item.id }, query: {} },
    }
  })
}

export function mergeFeeds(series: FeedRow[], patron: FeedRow[]): FeedRow[] {
  return [ ...series, ...patron ].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
}
