<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import DifficultyPips from '@/components/DifficultyPips.vue'
import { SetterTierEnum } from '@/graphql/generated/types'
import type { PuzzleCardFieldsFragment } from '@/graphql/generated/types'

const props = defineProps<{ puzzle: PuzzleCardFieldsFragment }>()

const TIER_LABEL: Record<string, string> = {
  [SetterTierEnum.Rising]: 'Rising setter',
  [SetterTierEnum.Experienced]: 'Experienced setter',
}
const tierBadge = TIER_LABEL[props.puzzle.author.setterTier] ?? null
</script>

<template>
  <RouterLink
    :to="{ name: 'puzzle', params: { id: props.puzzle.id } }"
    class="block p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
  >
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-medium text-ink-text truncate">{{ props.puzzle.title }}</span>
      <span
        v-if="props.puzzle.avgRating"
        class="text-xs text-faint shrink-0"
      >★ {{ props.puzzle.avgRating.toFixed(1) }}</span>
    </div>
    <span class="text-xs text-soft">by <AuthorAttribution
      :author="props.puzzle.author"
      :author-name="props.puzzle.authorName"
      plain
    /></span>
    <div class="mt-2 flex items-center justify-between gap-2">
      <DifficultyPips
        v-if="props.puzzle.effectiveDifficulty != null"
        :model-value="props.puzzle.effectiveDifficulty"
        readonly
        :size="12"
      />
      <span class="text-xs text-faint">
        {{ props.puzzle.grid.rows }}×{{ props.puzzle.grid.cols }} · {{ props.puzzle.solveCount }} solve{{ props.puzzle.solveCount === 1 ? '' : 's' }}
      </span>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-1">
      <span
        v-if="props.puzzle.featured"
        class="text-[10px] px-1.5 py-0.5 rounded bg-spark-tint text-spark font-medium"
      >Featured</span>
      <span
        v-if="tierBadge"
        class="text-[10px] px-1.5 py-0.5 rounded bg-action-tint text-action"
      >{{ tierBadge }}</span>
      <span
        v-for="type in props.puzzle.constraintTypes.slice(0, 4)"
        :key="type"
        class="text-[10px] px-1.5 py-0.5 rounded bg-line text-soft"
      >{{ type.replace(/_/g, ' ') }}</span>
    </div>
  </RouterLink>
</template>
