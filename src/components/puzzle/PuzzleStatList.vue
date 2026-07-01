<script setup lang="ts">
import { computed } from 'vue'
import DifficultyPips from '@/components/DifficultyPips.vue'
import type { PuzzleDescriptionFieldsFragment } from '@/graphql/generated/types'

// Desktop-only stat list for the play rail (the banner already shows these on
// mobile): community difficulty, average rating, solves, favorites, publish date.
const props = defineProps<{ puzzle: PuzzleDescriptionFieldsFragment }>()

const published = computed(() =>
  props.puzzle.publishedAt
    ? new Date(props.puzzle.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : null,
)
</script>

<template>
  <dl class="hidden lg:block border-t border-line pt-3 text-sm">
    <div
      v-if="puzzle.effectiveDifficulty != null"
      class="flex items-center justify-between py-1"
    >
      <dt class="text-soft">
        Difficulty
      </dt>
      <dd>
        <DifficultyPips
          :model-value="puzzle.effectiveDifficulty"
          readonly
          :size="13"
        />
      </dd>
    </div>
    <div
      v-if="puzzle.avgRating"
      class="flex items-center justify-between py-1"
    >
      <dt class="text-soft">
        Rating
      </dt>
      <dd class="tabular-nums">
        <span class="text-spark">★</span> {{ puzzle.avgRating.toFixed(1) }}
      </dd>
    </div>
    <div class="flex items-center justify-between py-1">
      <dt class="text-soft">
        Solves
      </dt>
      <dd class="tabular-nums">
        {{ puzzle.solveCount }}
      </dd>
    </div>
    <div class="flex items-center justify-between py-1">
      <dt class="text-soft">
        Favorites
      </dt>
      <dd class="tabular-nums">
        {{ puzzle.favoriteCount }}
      </dd>
    </div>
    <div
      v-if="published"
      class="flex items-center justify-between py-1"
    >
      <dt class="text-soft">
        Published
      </dt>
      <dd>{{ published }}</dd>
    </div>
  </dl>
</template>
