<script setup lang="ts">
import { computed } from 'vue'
import type { PublicUserFieldsFragment } from '@/graphql/generated/types'

type Stats = NonNullable<PublicUserFieldsFragment['profileStats']>

const props = defineProps<{ stats: Stats }>()

const tiles = computed(() => [
  { label: 'Collections', value: String(props.stats.collectionCount) },
  { label: 'Series', value: String(props.stats.seriesCount) },
  { label: 'Solves received', value: String(props.stats.totalSolvesReceived) },
  { label: 'Favorites received', value: String(props.stats.totalFavoritesReceived) },
  {
    label: 'Average rating',
    value: props.stats.avgRatingReceived ? `★ ${props.stats.avgRatingReceived.toFixed(1)}` : 'Not rated',
  },
  { label: 'Reviews received', value: String(props.stats.reviewsReceivedCount) },
])
</script>

<template>
  <ul class="grid grid-cols-2 sm:grid-cols-3 gap-3">
    <li
      v-for="tile in tiles"
      :key="tile.label"
      class="rounded-xl border border-line p-3"
    >
      <div class="font-display text-xl font-semibold tabular-nums text-ink-text">
        {{ tile.value }}
      </div>
      <div class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-faint">
        {{ tile.label }}
      </div>
    </li>
  </ul>
</template>
