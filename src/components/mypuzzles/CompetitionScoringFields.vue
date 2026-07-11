<script setup lang="ts">
import type { CollectionDetailQuery } from '@/graphql/generated/types'
import { CompetitionSubmissionPolicyEnum } from '@/graphql/generated/types'

type Config = NonNullable<NonNullable<CollectionDetailQuery['collection']>['competitionConfig']>
type ConfigPatch = {
  timeLimitSeconds?: number
  penaltyPoints?: number
  bonusPointsPerMinute?: number
  submissionPolicy?: CompetitionSubmissionPolicyEnum
  clampScoreAtZero?: boolean
  showEntryPoints?: boolean
}

// The numeric contest knobs + submission policy. Saves each field on change.
const props = defineProps<{ config: Config }>()
const emit = defineEmits<{ save: [config: ConfigPatch] }>()

const POLICY_HINTS: Record<CompetitionSubmissionPolicyEnum, string> = {
  [CompetitionSubmissionPolicyEnum.Blind]:
    'Solvers never learn whether a submission is correct and may resubmit freely; their last submission per puzzle is scored.',
  [CompetitionSubmissionPolicyEnum.Instant]:
    'Solvers see the verdict immediately; every wrong submission costs the penalty.',
  [CompetitionSubmissionPolicyEnum.Single]:
    'One submission per puzzle, no second chances.',
}

function minutes(): number | '' {
  return props.config.timeLimitSeconds ? Math.round(props.config.timeLimitSeconds / 60) : ''
}

function saveMinutes(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (value > 0) emit('save', { timeLimitSeconds: Math.round(value * 60) })
}

function saveNumber(field: 'penaltyPoints' | 'bonusPointsPerMinute', event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (value >= 0) emit('save', { [field]: Math.round(value) })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap gap-4">
      <label class="text-sm text-soft flex flex-col gap-1">
        Time limit (minutes)
        <input
          type="number"
          min="1"
          :value="minutes()"
          class="w-28 text-sm px-2.5 py-1.5 rounded-lg border border-line bg-surface text-ink-text"
          @change="saveMinutes"
        >
      </label>
      <label class="text-sm text-soft flex flex-col gap-1">
        Penalty per wrong answer
        <input
          type="number"
          min="0"
          :value="config.penaltyPoints"
          class="w-28 text-sm px-2.5 py-1.5 rounded-lg border border-line bg-surface text-ink-text"
          @change="saveNumber('penaltyPoints', $event)"
        >
      </label>
      <label class="text-sm text-soft flex flex-col gap-1">
        Bonus per minute left
        <input
          type="number"
          min="0"
          :value="config.bonusPointsPerMinute"
          class="w-28 text-sm px-2.5 py-1.5 rounded-lg border border-line bg-surface text-ink-text"
          @change="saveNumber('bonusPointsPerMinute', $event)"
        >
      </label>
    </div>

    <label class="text-sm text-soft flex flex-col gap-1">
      Submissions
      <select
        :value="config.submissionPolicy"
        class="self-start text-sm px-2 py-1.5 rounded-lg border border-line bg-surface"
        @change="emit('save', { submissionPolicy: ($event.target as HTMLSelectElement).value as CompetitionSubmissionPolicyEnum })"
      >
        <option :value="CompetitionSubmissionPolicyEnum.Blind">Blind (default)</option>
        <option :value="CompetitionSubmissionPolicyEnum.Instant">Instant feedback</option>
        <option :value="CompetitionSubmissionPolicyEnum.Single">Single submission</option>
      </select>
    </label>
    <p class="text-xs text-faint">
      {{ POLICY_HINTS[config.submissionPolicy] }}
    </p>
    <label class="text-sm text-soft flex items-center gap-2">
      <input
        type="checkbox"
        :checked="config.clampScoreAtZero"
        @change="emit('save', { clampScoreAtZero: ($event.target as HTMLInputElement).checked })"
      >
      Scores can't go below zero
    </label>
    <label class="text-sm text-soft flex items-center gap-2">
      <input
        type="checkbox"
        :checked="config.showEntryPoints"
        @change="emit('save', { showEntryPoints: ($event.target as HTMLInputElement).checked })"
      >
      Show each puzzle's point value to solvers
    </label>
  </div>
</template>
