<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import { SetterTierEnum, CollectionModeEnum } from '@/graphql/generated/types'
import type { CollectionsQuery } from '@/graphql/generated/types'

type ArchiveCollection = CollectionsQuery['collections']['nodes'][number]

const props = defineProps<{ collection: ArchiveCollection }>()

const TIER_LABEL: Record<string, string> = {
  [SetterTierEnum.Rising]: 'Rising setter',
  [SetterTierEnum.Experienced]: 'Experienced setter',
}
const tierBadge = TIER_LABEL[props.collection.author.setterTier] ?? null
</script>

<template>
  <RouterLink
    :to="{ name: 'collection', params: { id: props.collection.id } }"
    class="block p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
  >
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-medium text-ink-text truncate">{{ props.collection.title }}</span>
      <span
        v-if="props.collection.avgRating"
        class="text-xs text-faint shrink-0"
      >★ {{ props.collection.avgRating.toFixed(1) }}</span>
    </div>
    <span class="text-xs text-soft">by <AuthorAttribution
      :author="props.collection.author"
      plain
    /></span>
    <div class="mt-2 flex items-center justify-between gap-2">
      <span class="text-xs text-faint">
        {{ props.collection.puzzleCount }} puzzle{{ props.collection.puzzleCount === 1 ? '' : 's' }} · {{ props.collection.solveCount }} solve{{ props.collection.solveCount === 1 ? '' : 's' }}
      </span>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-1">
      <span
        v-if="props.collection.mode === CollectionModeEnum.Sequence"
        class="text-[10px] px-1.5 py-0.5 rounded bg-line text-soft"
      >In sequence</span>
      <span
        v-if="tierBadge"
        class="text-[10px] px-1.5 py-0.5 rounded bg-action-tint text-action"
      >{{ tierBadge }}</span>
    </div>
  </RouterLink>
</template>
