<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import CollectionLeaderboard from '@/components/collections/CollectionLeaderboard.vue'
import CollectionEntryFlow from '@/components/collections/CollectionEntryFlow.vue'
import CollectionProgress from '@/components/collections/CollectionProgress.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiPrinterOutline } from '@mdi/js'
import type { CollectionPublicQuery } from '@/graphql/generated/types'
import { CollectionModeEnum } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

// A basic collection: strictly puzzles. Title, author, plain description, the
// list (sequence mode still applies), and the legacy timed leaderboard. No
// cover, accents, story, or hunt chrome, even if dormant hunt data exists.
const props = defineProps<{
  collection: Collection
  solved: Set<string>
  shareToken: string | null
}>()

const isSequence = computed(() => props.collection.mode === CollectionModeEnum.Sequence)
</script>

<template>
  <div>
    <h1
      data-tour="collection-header"
      class="font-display text-2xl font-bold"
    >
      {{ collection.title }}
    </h1>
    <p class="text-sm text-soft mt-1">
      by <AuthorAttribution :author="collection.author" /> · {{ collection.puzzles.length }} puzzle{{ collection.puzzles.length === 1 ? '' : 's' }}
    </p>
    <p
      v-if="collection.description"
      class="text-sm text-ink-text mt-3 whitespace-pre-line"
    >
      {{ collection.description }}
    </p>
    <p
      v-if="isSequence"
      class="text-xs text-action mt-3"
    >
      Solve these in order — each unlocks the next.
    </p>
    <p class="flex items-center gap-4 mt-2 text-xs">
      <RouterLink
        :to="{ name: 'collection-print', params: { id: collection.id }, query: shareToken ? { t: shareToken } : {} }"
        class="inline-flex items-center gap-1 text-soft hover:text-action"
      >
        <MdiIcon
          :path="mdiPrinterOutline"
          :size="14"
        />
        Print hand-out
      </RouterLink>
    </p>

    <CollectionProgress
      :entries="collection.entries"
      :solved="solved"
      :timed="collection.timed"
      :next-release-at="collection.nextReleaseAt ?? null"
    />

    <CollectionEntryFlow
      data-tour="collection-puzzles"
      :entries="collection.entries"
      :puzzles="collection.puzzles"
      :is-sequence="isSequence"
      :solved="solved"
      :collection-id="collection.id"
      :share-token="shareToken"
    />

    <p
      v-if="!collection.puzzles.length"
      class="text-soft mt-6"
    >
      No puzzles in this collection yet.
    </p>

    <CollectionLeaderboard
      v-if="collection.timed"
      :collection-id="collection.id"
    />
  </div>
</template>
