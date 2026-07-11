<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiFlagCheckered } from '@mdi/js'
import type { CollectionPublicQuery } from '@/graphql/generated/types'

type Run = NonNullable<NonNullable<CollectionPublicQuery['collection']>['myCompetitionRun']>

// The finish line: the finalized score breakdown for the viewer's run.
const props = defineProps<{ run: Run }>()

function fmtTime(seconds: number | null | undefined): string {
  const total = seconds ?? 0
  const m = Math.floor(total / 60)
  return `${m}:${String(total % 60).padStart(2, '0')}`
}

const rows = [
  { label: 'Puzzles solved', value: () => String(props.run.correctCount ?? 0) },
  { label: 'Base points', value: () => String(props.run.basePoints ?? 0) },
  { label: 'Penalties', value: () => `−${props.run.penaltyPoints ?? 0}` },
  { label: 'Time bonus', value: () => `+${props.run.bonusPoints ?? 0}` },
  { label: 'Time used', value: () => fmtTime(props.run.timeUsedSeconds) },
]
</script>

<template>
  <section class="mt-4 rounded-xl border border-action bg-action-tint p-4">
    <div class="flex items-start gap-3">
      <MdiIcon
        :path="mdiFlagCheckered"
        :size="22"
        class="text-action shrink-0 mt-0.5"
      />
      <div class="flex-1 min-w-0">
        <p class="font-display font-bold text-action text-lg">
          Final score: {{ run.totalPoints ?? 0 }}
        </p>
        <dl class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
          <template
            v-for="row in rows"
            :key="row.label"
          >
            <div>
              <dt class="text-xs text-soft">
                {{ row.label }}
              </dt>
              <dd class="text-ink-text font-medium">
                {{ row.value() }}
              </dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
  </section>
</template>
