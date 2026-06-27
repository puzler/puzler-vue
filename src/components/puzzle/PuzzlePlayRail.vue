<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import PuzzleThumbnail from '@/components/grid/PuzzleThumbnail.vue'
import PuzzlePlayLinks from '@/components/puzzle/PuzzlePlayLinks.vue'
import DifficultyPips from '@/components/DifficultyPips.vue'
import type { PuzzleDescriptionFieldsFragment } from '@/graphql/generated/types'
import type { SerializedPuzzle } from '@/utils/puzzleExport'

// The thumbnail + play CTAs card. On mobile the thumbnail is capped and the stat
// list is hidden (the banner already shows those numbers); on desktop it fills
// the rail and the full stat list appears.
const props = defineProps<{
  puzzle: PuzzleDescriptionFieldsFragment
  playTo: RouteLocationRaw
  thumbnailDefinition: SerializedPuzzle | null
}>()

const published = computed(() =>
  props.puzzle.publishedAt
    ? new Date(props.puzzle.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : null,
)
</script>

<template>
  <div class="bg-surface border border-line rounded-xl p-4 flex flex-col gap-4">
    <div
      v-if="thumbnailDefinition"
      class="w-full max-w-xs mx-auto lg:max-w-none"
    >
      <PuzzleThumbnail :definition="thumbnailDefinition" />
    </div>

    <PuzzlePlayLinks
      block
      :play-to="playTo"
      :sudokupad-url="puzzle.sudokupadUrl"
      :sudokupad-includes-solution="puzzle.sudokupadIncludesSolution"
    />

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
  </div>
</template>
