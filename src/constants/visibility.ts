import {
  PuzzleVisibilityEnum, CollectionVisibilityEnum, SeriesVisibilityEnum,
} from '@/graphql/generated/types'

// Visibility values an author may select from the list view, with display
// labels. The base arrays are what every author gets; Patreon creators
// additionally get the Patrons option via the helpers below (the API rejects
// it for anyone else). The subscriber tier stays unoffered (stubbed). Kept
// here so the inline editor (RowMeta), the filter dropdown (ListToolbar), and
// the status label all share one source of truth per entity.
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

export const PATRON_PUZZLE_OPTION = { value: PuzzleVisibilityEnum.PatronsOnly, label: 'Patrons' } as const
export const PATRON_COLLECTION_OPTION = { value: CollectionVisibilityEnum.PatronsOnly, label: 'Patrons' } as const

export type PuzzleVisibilityOption = { value: PuzzleVisibilityEnum; label: string }
export type CollectionVisibilityOption = { value: CollectionVisibilityEnum; label: string }

// Selectable options per viewer: pass the auth store's isPatreonCreator.
export function puzzleVisibilityOptions(includePatrons: boolean): readonly PuzzleVisibilityOption[] {
  return includePatrons ? [ ...PUZZLE_VISIBILITY_OPTIONS, PATRON_PUZZLE_OPTION ] : PUZZLE_VISIBILITY_OPTIONS
}

export function collectionVisibilityOptions(includePatrons: boolean): readonly CollectionVisibilityOption[] {
  return includePatrons ? [ ...COLLECTION_VISIBILITY_OPTIONS, PATRON_COLLECTION_OPTION ] : COLLECTION_VISIBILITY_OPTIONS
}

// Filter options for the puzzle list. Unlike the edit options above, this
// includes DRAFT (a status bucket, not a settable visibility) so authors can
// narrow to unpublished puzzles. Collections/series reuse their edit options
// as filter options since they have no draft state.
export const PUZZLE_VISIBILITY_FILTER_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  ...PUZZLE_VISIBILITY_OPTIONS,
] as const

export function puzzleVisibilityFilterOptions(includePatrons: boolean) {
  return includePatrons ? [ ...PUZZLE_VISIBILITY_FILTER_OPTIONS, PATRON_PUZZLE_OPTION ] : PUZZLE_VISIBILITY_FILTER_OPTIONS
}

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
