import {
  PuzzleVisibilityEnum, CollectionVisibilityEnum, SeriesVisibilityEnum,
} from '@/graphql/generated/types'

// Visibility values an author may select from the list view, with display
// labels. Patron/subscriber tiers are omitted: the API blocks setting them and
// they aren't part of the basic visibility switch. Kept here so the inline
// editor (RowMeta), the filter dropdown (ListToolbar), and the status label all
// share one source of truth per entity.
export const PUZZLE_VISIBILITY_OPTIONS = [
  { value: PuzzleVisibilityEnum.Private, label: 'Private' },
  { value: PuzzleVisibilityEnum.Unlisted, label: 'Unlisted' },
  { value: PuzzleVisibilityEnum.ContainersOnly, label: 'Collections & series' },
  { value: PuzzleVisibilityEnum.Public, label: 'Public' },
] as const

export const COLLECTION_VISIBILITY_OPTIONS = [
  { value: CollectionVisibilityEnum.Private, label: 'Private' },
  { value: CollectionVisibilityEnum.Unlisted, label: 'Unlisted' },
  { value: CollectionVisibilityEnum.ContainersOnly, label: 'In series' },
  { value: CollectionVisibilityEnum.Public, label: 'Public' },
] as const

export const SERIES_VISIBILITY_OPTIONS = [
  { value: SeriesVisibilityEnum.Private, label: 'Private' },
  { value: SeriesVisibilityEnum.Unlisted, label: 'Unlisted' },
  { value: SeriesVisibilityEnum.Public, label: 'Public' },
] as const

// Filter options for the puzzle list. Unlike the edit options above, this
// includes DRAFT (a status bucket, not a settable visibility) so authors can
// narrow to unpublished puzzles. Collections/series reuse their edit options
// as filter options since they have no draft state.
export const PUZZLE_VISIBILITY_FILTER_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  ...PUZZLE_VISIBILITY_OPTIONS,
] as const

// Display label for any visibility value (covers the patron/subscriber tiers
// too, so a puzzle set to one still renders sensibly).
export const VISIBILITY_LABEL: Record<string, string> = {
  [PuzzleVisibilityEnum.Private]: 'Private',
  [PuzzleVisibilityEnum.Unlisted]: 'Unlisted',
  [PuzzleVisibilityEnum.ContainersOnly]: 'Collections & series',
  [PuzzleVisibilityEnum.Public]: 'Public',
  [PuzzleVisibilityEnum.PatronsOnly]: 'Patrons',
  [PuzzleVisibilityEnum.SubscribersOnly]: 'Subscribers',
}
