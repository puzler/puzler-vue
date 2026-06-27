<script setup lang="ts">
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import DifficultyPips from '@/components/DifficultyPips.vue'
import type { PuzzleDescriptionFieldsFragment } from '@/graphql/generated/types'

// Full-bleed page header: the paper band spans the viewport (with an amber
// accent stripe), while its content is constrained to the same centered
// container as the body so the title lines up with everything below.
defineProps<{ puzzle: PuzzleDescriptionFieldsFragment }>()
</script>

<template>
  <header class="bg-canvas border-b border-line border-l-[6px] border-spark">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6">
      <h1 class="font-display text-2xl sm:text-3xl font-bold text-ink-text">
        {{ puzzle.title }}
      </h1>
      <p class="mt-1 text-soft">
        by <AuthorAttribution
          :author="puzzle.author"
          :author-name="puzzle.authorName"
        />
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-soft">
        <DifficultyPips
          v-if="puzzle.effectiveDifficulty != null"
          :model-value="puzzle.effectiveDifficulty"
          readonly
          :size="14"
        />
        <span v-if="puzzle.avgRating"><span class="text-spark">★</span> {{ puzzle.avgRating.toFixed(1) }}</span>
        <span>{{ puzzle.grid.rows }}×{{ puzzle.grid.cols }}</span>
        <span>{{ puzzle.solveCount }} solve{{ puzzle.solveCount === 1 ? '' : 's' }}</span>
      </div>

      <div
        v-if="puzzle.constraintTypes.length"
        class="mt-3 flex flex-wrap items-center gap-1"
      >
        <span
          v-for="type in puzzle.constraintTypes"
          :key="type"
          class="text-[11px] px-1.5 py-0.5 rounded bg-line text-soft"
        >{{ type.replace(/_/g, ' ') }}</span>
      </div>
    </div>
  </header>
</template>
