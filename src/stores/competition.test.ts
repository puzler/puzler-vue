import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mockQuery, mockMutate } = vi.hoisted(() => ({ mockQuery: vi.fn(), mockMutate: vi.fn() }))
vi.mock('@/utils/apolloClient', () => ({
  apolloClient: { query: mockQuery, mutate: mockMutate },
}))

import { useCompetitionStore } from './competition'
import { usePlayerSettingsStore } from './playerSettings'
import { CompetitionSubmissionPolicyEnum } from '@/graphql/generated/types'

function collectionPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    title: 'Speed Trial',
    shareToken: null,
    competitionConfig: {
      submissionPolicy: CompetitionSubmissionPolicyEnum.Blind,
      enforcedSettings: { hideTimer: true, notARealKey: true },
    },
    myCompetitionRun: {
      id: 'r1',
      finalized: false,
      finishedAt: null,
      secondsRemaining: 120,
      submissions: [],
    },
    ...overrides,
  }
}

describe('competition store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    mockQuery.mockReset()
    mockMutate.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('anchors the countdown to the server secondsRemaining, not local clocks', () => {
    const competition = useCompetitionStore()
    competition.hydrateFromCollection(collectionPayload())
    expect(competition.remainingSeconds).toBe(120)
    vi.advanceTimersByTime(30_000)
    expect(competition.remainingSeconds).toBe(90)
    expect(competition.isActiveFor('c1')).toBe(true)
  })

  it('expires at zero: submit closes and overrides clear', async () => {
    const competition = useCompetitionStore()
    const player = usePlayerSettingsStore()
    competition.hydrateFromCollection(collectionPayload())
    await vi.advanceTimersByTimeAsync(1000)
    expect(player.effective.hideTimer).toBe(true)

    await vi.advanceTimersByTimeAsync(121_000)
    expect(competition.isActive).toBe(false)
    expect(competition.canSubmit('p1')).toBe(false)
    expect(player.isEnforced('hideTimer')).toBe(false)
  })

  it('filters unknown keys from enforced settings and always blocks collaboration', async () => {
    const competition = useCompetitionStore()
    const player = usePlayerSettingsStore()
    player.settings.enableCollaborationMode = true
    competition.hydrateFromCollection(collectionPayload())
    await vi.advanceTimersByTimeAsync(1000)

    expect(player.effective.enableCollaborationMode).toBe(false)
    expect(player.isEnforced('showRulesOnStart')).toBe(false)
    expect('notARealKey' in player.overrides).toBe(false)
  })

  it('ignores finalized or finished runs', () => {
    const competition = useCompetitionStore()
    competition.hydrateFromCollection(collectionPayload({
      myCompetitionRun: { id: 'r1', finalized: true, finishedAt: null, secondsRemaining: 120, submissions: [] },
    }))
    expect(competition.run).toBeNull()
  })

  it('enforces the single policy client-side after one submission', async () => {
    const competition = useCompetitionStore()
    competition.hydrateFromCollection(collectionPayload({
      competitionConfig: { submissionPolicy: CompetitionSubmissionPolicyEnum.Single, enforcedSettings: {} },
    }))
    mockMutate.mockResolvedValue({ data: { submitCompetitionEntry: { accepted: true, correct: null, errors: [] } } })

    expect(competition.canSubmit('p1')).toBe(true)
    await competition.submit('p1', { r0c0: 1 })
    expect(competition.canSubmit('p1')).toBe(false)
    expect(competition.canSubmit('p2')).toBe(true)
  })

  it('tracks blind submissions as submitted without a verdict', async () => {
    const competition = useCompetitionStore()
    competition.hydrateFromCollection(collectionPayload())
    mockMutate.mockResolvedValue({ data: { submitCompetitionEntry: { accepted: true, correct: null, errors: [] } } })

    await competition.submit('p1', { r0c0: 1 })
    expect(competition.submissionState('p1')).toBe('submitted')
    expect(competition.submissionState('p2')).toBe('none')
  })

  it('surfaces a thrown mutation as a rejected submission instead of throwing', async () => {
    const competition = useCompetitionStore()
    competition.hydrateFromCollection(collectionPayload())
    mockMutate.mockRejectedValue({ graphQLErrors: [{ message: 'Authentication required' }] })

    const result = await competition.submit('p1', { r0c0: 1 })
    expect(result).toEqual({ accepted: false, correct: null, error: 'Authentication required' })
    expect(competition.submissionState('p1')).toBe('none')
  })

  it('falls back to a generic error message for network failures', async () => {
    const competition = useCompetitionStore()
    competition.hydrateFromCollection(collectionPayload())
    mockMutate.mockRejectedValue(new Error('Failed to fetch'))

    const result = await competition.submit('p1', { r0c0: 1 })
    expect(result.accepted).toBe(false)
    expect(result.error).toBe('Could not submit. Check your connection and try again.')
  })

  it('explains why a submission is blocked', async () => {
    const competition = useCompetitionStore()
    competition.hydrateFromCollection(collectionPayload({
      competitionConfig: { submissionPolicy: CompetitionSubmissionPolicyEnum.Single, enforcedSettings: {} },
    }))
    mockMutate.mockResolvedValue({ data: { submitCompetitionEntry: { accepted: true, correct: null, errors: [] } } })

    expect(competition.submitBlockReason('p1')).toBeNull()
    await competition.submit('p1', { r0c0: 1 })
    expect(competition.submitBlockReason('p1')).toContain('one submission per puzzle')
    await vi.advanceTimersByTimeAsync(121_000)
    expect(competition.submitBlockReason('p2')).toContain('Time is up')
  })
})
