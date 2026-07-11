<script setup lang="ts">
import { computed } from 'vue'
import CollectionHeader from '@/components/collections/CollectionHeader.vue'
import CollectionLeaderboard from '@/components/collections/CollectionLeaderboard.vue'
import CollectionEntryFlow from '@/components/collections/CollectionEntryFlow.vue'
import CollectionToc from '@/components/collections/CollectionToc.vue'
import CollectionCodewordBox from '@/components/collections/CollectionCodewordBox.vue'
import CollectionProgress from '@/components/collections/CollectionProgress.vue'
import { tableOfContents, type FlowEntry } from '@/utils/collectionEntries'
import type { CollectionPublicQuery } from '@/graphql/generated/types'
import { CollectionModeEnum } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

// The hunt experience: header with cover/story intro, progress, codeword box,
// table of contents, the interleaved entry flow, and the timed leaderboard.
// Extracted verbatim from CollectionView when it became a kind dispatcher.
const props = defineProps<{
  collection: Collection
  bodyHtml: string
  solved: Set<string>
  shareToken: string | null
}>()
const emit = defineEmits<{ reload: [] }>()

const isSequence = computed(() => props.collection.mode === CollectionModeEnum.Sequence)

// Titled story pages become a table of contents; one heading alone isn't worth
// a nav, so it appears from two on. Locked chapters show but don't link.
const toc = computed(() => {
  const items = tableOfContents(props.collection.entries as FlowEntry[], isSequence.value, props.solved)
  return items.length >= 2 ? items : []
})
</script>

<template>
  <div>
    <CollectionHeader
      :collection="collection"
      :body-html="bodyHtml"
      :is-sequence="isSequence"
      :share-token="shareToken"
    />

    <CollectionProgress
      :entries="collection.entries"
      :solved="solved"
      :timed="collection.timed"
      :next-release-at="collection.nextReleaseAt ?? null"
    />

    <CollectionCodewordBox
      v-if="collection.hasCodewords"
      :collection-id="collection.id"
      :share-token="shareToken"
      @unlocked="emit('reload')"
    />

    <CollectionToc
      v-if="toc.length"
      :items="toc"
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
