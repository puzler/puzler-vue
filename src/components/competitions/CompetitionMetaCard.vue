<script setup lang="ts">
import { computed } from 'vue'
import type { CollectionPublicQuery, CompetitionSubmissionPolicyEnum } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

// The rules of engagement, shown before a solver commits their one attempt.
const props = defineProps<{ collection: Collection }>()

const config = computed(() => props.collection.competitionConfig)
const minutes = computed(() =>
  (config.value?.timeLimitSeconds ? Math.round(config.value.timeLimitSeconds / 60) : null))
const totalPoints = computed(() =>
  props.collection.entries.reduce((sum, e) => sum + (e.entryType === 'Puzzle' ? e.points : 0), 0))

const POLICY_COPY: Record<CompetitionSubmissionPolicyEnum, string> = {
  BLIND: "You won't be told whether a submission is correct. Resubmit as often as you like — your last submission per puzzle is what counts.",
  INSTANT: 'You see the verdict on every submission, and every wrong one costs points.',
  SINGLE: 'One submission per puzzle. Make it count.',
} as Record<CompetitionSubmissionPolicyEnum, string>
</script>

<template>
  <section class="mt-4 rounded-xl border border-line bg-surface p-4 flex flex-col gap-2">
    <h2 class="text-[11px] font-semibold uppercase tracking-widest text-soft">
      How this competition works
    </h2>
    <ul class="text-sm text-ink-text flex flex-col gap-1.5">
      <li v-if="minutes">
        ⏱ You'll have <strong>{{ minutes }} minute{{ minutes === 1 ? '' : 's' }}</strong> from the moment you start.
      </li>
      <li>
        🧩 {{ collection.entries.length }} puzzle{{ collection.entries.length === 1 ? '' : 's' }},
        worth <strong>{{ totalPoints }} points</strong> together.
      </li>
      <li v-if="config">
        {{ POLICY_COPY[config.submissionPolicy] }}
      </li>
      <li v-if="config && config.penaltyPoints > 0">
        ⚠️ Incorrect answers cost {{ config.penaltyPoints }} points.
      </li>
      <li v-if="config && config.bonusPointsPerMinute > 0">
        ✨ Solve everything early: {{ config.bonusPointsPerMinute }} bonus points per minute left on the clock.
      </li>
      <li class="text-action font-medium">
        You get exactly one attempt. The puzzles stay hidden until your clock starts.
      </li>
    </ul>
  </section>
</template>
