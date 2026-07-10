<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import RichProseBody from '@/components/RichProseBody.vue'
import CollectionLeaderboard from '@/components/collections/CollectionLeaderboard.vue'
import CollectionEntryFlow from '@/components/collections/CollectionEntryFlow.vue'
import CollectionToc from '@/components/collections/CollectionToc.vue'
import { apolloClient } from '@/utils/apolloClient'
import { solvedIds } from '@/utils/solveProgress'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { collectionThemeClasses } from '@/utils/collectionTheme'
import { tableOfContents } from '@/utils/collectionEntries'
import CollectionPublicDocument from '@/graphql/gql/collections/queries/CollectionPublic.graphql'
import CollectionByTokenPublicDocument from '@/graphql/gql/collections/queries/CollectionByTokenPublic.graphql'
import type {
  CollectionPublicQuery, CollectionPublicQueryVariables,
  CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables,
} from '@/graphql/generated/types'
import { CollectionModeEnum } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

const route = useRoute()
const collection = ref<Collection | null>(null)
const loading = ref(true)
const solved = ref(new Set<string>())

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))
const isSequence = computed(() => collection.value?.mode === CollectionModeEnum.Sequence)

// Curated page accents + the rich body (server-sanitized; DOMPurify again as
// defence-in-depth before v-html).
const themeClasses = computed(() => (collection.value ? collectionThemeClasses(collection.value) : []))
const bodyHtml = computed(() => sanitizeHtml(collection.value?.pageDescriptionHtml ?? null))

// Titled story pages become a table of contents; one heading alone isn't worth
// a nav, so it appears from two on. Locked chapters show but don't link.
const toc = computed(() => {
  if (!collection.value) return []
  const items = tableOfContents(collection.value.entries, isSequence.value, solved.value)
  return items.length >= 2 ? items : []
})

async function load() {
  const id = typeof route.params.id === 'string' ? route.params.id : null
  try {
    if (shareToken.value) {
      const { data } = await apolloClient.query<CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables>({
        query: CollectionByTokenPublicDocument, variables: { token: shareToken.value }, fetchPolicy: 'network-only',
      })
      collection.value = data?.collectionByToken ?? null
    } else if (id) {
      const { data } = await apolloClient.query<CollectionPublicQuery, CollectionPublicQueryVariables>({
        query: CollectionPublicDocument, variables: { id }, fetchPolicy: 'network-only',
      })
      collection.value = data?.collection ?? null
    }
    solved.value = solvedIds()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <ContentPage>
    <div
      class="bg-paper"
      :class="themeClasses"
    >
      <div class="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <p
          v-if="loading"
          class="text-soft"
        >
          Loading…
        </p>
        <p
          v-else-if="!collection"
          class="text-soft"
        >
          This collection isn’t available.
        </p>
        <div v-else>
          <img
            v-if="collection.coverImageUrl"
            :src="collection.coverImageUrl"
            alt=""
            class="w-full aspect-video object-cover rounded-xl border border-line mb-4"
          >
          <h1
            data-tour="collection-header"
            class="font-display text-2xl font-bold"
          >
            {{ collection.title }}
          </h1>
          <p class="text-sm text-soft mt-1">
            by <AuthorAttribution :author="collection.author" /> · {{ collection.puzzles.length }} puzzle{{ collection.puzzles.length === 1 ? '' : 's' }}
          </p>
          <RichProseBody
            v-if="bodyHtml"
            :html="bodyHtml"
            class="mt-3"
          />
          <p
            v-else-if="collection.description"
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
          <p
            v-if="collection.timed"
            class="text-xs text-action mt-1"
          >
            ⏱ Timed — your solve times are ranked below.
          </p>

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
      </div>
    </div>
  </ContentPage>
</template>
