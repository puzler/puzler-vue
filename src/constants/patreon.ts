import { PatronGateModeEnum, PatronLockReasonEnum, type PatronGateInput } from '@/graphql/generated/types'

// The publish-flow form for a patron gate, plus the scheduled release that
// rides along in the same panel. Converted to a PatronGateInput on save.
export interface PatronGateForm {
  mode: PatronGateModeEnum
  minTierId: string | null
  tierIds: string[]
  minAmountCents: number | null
  patronsSinceRelease: boolean
  releasedAt: string | null
}

export function defaultPatronGateForm(): PatronGateForm {
  return {
    mode: PatronGateModeEnum.MinTier,
    minTierId: null,
    tierIds: [],
    minAmountCents: null,
    patronsSinceRelease: false,
    releasedAt: null,
  }
}

// Seed the form from a persisted gate (the PuzzleAdminFields shape) and the
// item's scheduled release. A null gate is the server's default gate.
export function patronGateForm(
  gate:
    | {
        mode: PatronGateModeEnum
        minTier?: { id: string } | null
        tiers: { id: string }[]
        minAmountCents?: number | null
        patronsSinceRelease: boolean
      }
    | null
    | undefined,
  releasedAt: string | null,
): PatronGateForm {
  if (!gate) return { ...defaultPatronGateForm(), releasedAt }
  return {
    mode: gate.mode,
    minTierId: gate.minTier?.id ?? null,
    tierIds: gate.tiers.map((t) => t.id),
    minAmountCents: gate.minAmountCents ?? null,
    patronsSinceRelease: gate.patronsSinceRelease,
    releasedAt,
  }
}

export function patronGateInput(form: PatronGateForm): PatronGateInput {
  return {
    mode: form.mode,
    minTierId: form.mode === PatronGateModeEnum.MinTier ? form.minTierId : null,
    tierIds: form.mode === PatronGateModeEnum.TierList ? form.tierIds : [],
    minAmountCents: form.mode === PatronGateModeEnum.MinAmount ? form.minAmountCents : null,
    patronsSinceRelease: form.patronsSinceRelease,
  }
}

// The three gate modes an author chooses between when sharing with patrons.
// Minimum tier is the default: it matches how creators think about rewards,
// and the server falls back to the pledge amount for custom pledges.
export const GATE_MODE_OPTIONS = [
  {
    value: PatronGateModeEnum.MinTier,
    label: 'Minimum tier',
    hint: 'Patrons at this tier or any higher-priced tier qualify.',
  },
  {
    value: PatronGateModeEnum.TierList,
    label: 'Specific tiers',
    hint: 'Only patrons on the tiers you pick qualify.',
  },
  {
    value: PatronGateModeEnum.MinAmount,
    label: 'Minimum pledge',
    hint: 'Anyone pledging at least this amount qualifies.',
  },
] as const

// Teaser lock panel copy, keyed by the viewer's lock reason. The heading and
// body render above the state's call to action.
export const LOCK_REASON_COPY: Record<PatronLockReasonEnum, { heading: string; body: string }> = {
  [PatronLockReasonEnum.NotLinked]: {
    heading: 'For patrons',
    body: 'If you already support this creator on Patreon, connect your Patreon account to unlock it.',
  },
  [PatronLockReasonEnum.NotPatron]: {
    heading: 'For patrons',
    body: 'This is available to the creator\'s Patreon supporters.',
  },
  [PatronLockReasonEnum.InsufficientTier]: {
    heading: 'For higher tiers',
    body: 'Your current pledge doesn\'t include this release.',
  },
  [PatronLockReasonEnum.JoinedAfterRelease]: {
    heading: 'For patrons at release',
    body: 'This release was for patrons at the time it came out.',
  },
  [PatronLockReasonEnum.Declined]: {
    heading: 'Payment issue',
    body: 'Your Patreon payment was declined. Fix it on Patreon, then re-check your access.',
  },
  [PatronLockReasonEnum.CreatorUnavailable]: {
    heading: 'Unavailable',
    body: 'This creator\'s Patreon campaign is no longer available.',
  },
}
