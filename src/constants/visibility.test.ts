import { describe, it, expect } from 'vitest'
import {
  puzzleVisibilityOptions,
  collectionVisibilityOptions,
  puzzleVisibilityFilterOptions,
  PUZZLE_VISIBILITY_OPTIONS,
} from './visibility'
import { PuzzleVisibilityEnum, CollectionVisibilityEnum } from '@/graphql/generated/types'

describe('visibility option helpers', () => {
  it('returns the base options for non-creators', () => {
    expect(puzzleVisibilityOptions(false)).toEqual(PUZZLE_VISIBILITY_OPTIONS)
    expect(collectionVisibilityOptions(false).map((o) => o.value)).not.toContain(
      CollectionVisibilityEnum.PatronsOnly,
    )
  })

  it('appends the Patrons option for creators', () => {
    expect(puzzleVisibilityOptions(true).at(-1)?.value).toBe(PuzzleVisibilityEnum.PatronsOnly)
    expect(collectionVisibilityOptions(true).at(-1)?.value).toBe(CollectionVisibilityEnum.PatronsOnly)
  })

  it('mirrors the creator gate in the filter options', () => {
    expect(puzzleVisibilityFilterOptions(false).map((o) => o.value)).not.toContain(
      PuzzleVisibilityEnum.PatronsOnly,
    )
    expect(puzzleVisibilityFilterOptions(true).map((o) => o.value)).toContain(
      PuzzleVisibilityEnum.PatronsOnly,
    )
  })
})
