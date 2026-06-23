<script setup lang="ts">
import FacetSelect from './FacetSelect.vue'
import { TIME_RANGES, SETTER_TIERS, MIN_RATING_OPTIONS } from '@/constants/archive'
import type { TimeRangeEnum, SetterTierEnum } from '@/graphql/generated/types'

// Trimmed archive sidebar for the collection/series tabs. Containers have no
// constraints, difficulty, tags, grid size, featured flag, or per-viewer solve
// status, so only the facets that map onto their columns are offered. The time
// range filters on creation date (containers have no separate publish date).
const timeRange = defineModel<TimeRangeEnum | null>('timeRange', { required: true })
const setterTier = defineModel<SetterTierEnum | null>('setterTier', { required: true })
const minRating = defineModel<number | null>('minRating', { required: true })
</script>

<template>
  <aside class="w-56 shrink-0 flex flex-col gap-4">
    <FacetSelect
      v-model="timeRange"
      label="Released"
      :options="TIME_RANGES"
      any-label="All time"
    />
    <FacetSelect
      v-model="setterTier"
      label="Setter"
      :options="SETTER_TIERS"
      any-label="Any setter"
    />
    <FacetSelect
      v-model="minRating"
      label="Rating"
      :options="MIN_RATING_OPTIONS"
      any-label="Any rating"
    />
  </aside>
</template>
