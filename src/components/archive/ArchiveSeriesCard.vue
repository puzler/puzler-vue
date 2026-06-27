<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import { SetterTierEnum } from '@/graphql/generated/types'
import type { SeriesCardFieldsFragment } from '@/graphql/generated/types'

const props = defineProps<{ series: SeriesCardFieldsFragment }>()

const TIER_LABEL: Record<string, string> = {
  [SetterTierEnum.Rising]: 'Rising setter',
  [SetterTierEnum.Experienced]: 'Experienced setter',
}
const tierBadge = TIER_LABEL[props.series.author.setterTier] ?? null
</script>

<template>
  <RouterLink
    :to="{ name: 'series', params: { id: props.series.id } }"
    class="block p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
  >
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-medium text-ink-text truncate">{{ props.series.title }}</span>
      <span
        v-if="props.series.avgRating"
        class="text-xs text-faint shrink-0"
      >★ {{ props.series.avgRating.toFixed(1) }}</span>
    </div>
    <span class="text-xs text-soft">by <AuthorAttribution
      :author="props.series.author"
      plain
    /></span>
    <div class="mt-2 flex items-center justify-between gap-2">
      <span class="text-xs text-faint">
        {{ props.series.entryCount }} item{{ props.series.entryCount === 1 ? '' : 's' }} · {{ props.series.subscriberCount }} subscriber{{ props.series.subscriberCount === 1 ? '' : 's' }} · {{ props.series.solveCount }} solve{{ props.series.solveCount === 1 ? '' : 's' }}
      </span>
    </div>
    <div
      v-if="tierBadge"
      class="mt-2 flex flex-wrap items-center gap-1"
    >
      <span class="text-[10px] px-1.5 py-0.5 rounded bg-action-tint text-action">{{ tierBadge }}</span>
    </div>
  </RouterLink>
</template>
