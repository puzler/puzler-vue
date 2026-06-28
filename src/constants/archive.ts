import { TimeRangeEnum, SetterTierEnum, MyStatusEnum } from '@/graphql/generated/types'

// Facet option lists for the archive sidebar. Values are the GraphQL enum wire
// values; labels are human-facing.
// "All time" is the FacetSelect "Any" (null), so it isn't a listed option here.
export const TIME_RANGES = [
  { value: TimeRangeEnum.ThisWeek, label: 'This week' },
  { value: TimeRangeEnum.ThisMonth, label: 'This month' },
  { value: TimeRangeEnum.ThisYear, label: 'This year' },
] as const

export const SETTER_TIERS = [
  { value: SetterTierEnum.New, label: 'New setter' },
  { value: SetterTierEnum.Rising, label: 'Rising setter' },
  { value: SetterTierEnum.Experienced, label: 'Experienced setter' },
] as const

export const MY_STATUS_OPTIONS = [
  { value: MyStatusEnum.Unsolved, label: 'Unsolved' },
  { value: MyStatusEnum.Solved, label: 'Solved' },
  { value: MyStatusEnum.Favorited, label: 'Favorited' },
  { value: MyStatusEnum.SharedWithMe, label: 'Shared with me' },
] as const

// Difficulty levels (1-5) for the star-pip filter.
export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const

// Minimum-rating choices for the quality floor.
export const MIN_RATING_OPTIONS = [
  { value: 4, label: '4+ stars' },
  { value: 3, label: '3+ stars' },
  { value: 2, label: '2+ stars' },
] as const
