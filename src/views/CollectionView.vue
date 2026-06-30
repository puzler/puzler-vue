<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import CollectionLeaderboard from '@/components/collections/CollectionLeaderboard.vue'
import CollectionPuzzleList from '@/components/collections/CollectionPuzzleList.vue'
import { apolloClient } from '@/utils/apolloClient'
import { solvedIds } from '@/utils/solveProgress'
import { usePageTour } from '@/composables/usePageTour'
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

usePageTour({ ready: computed(() => !loading.value && !!collection.value) })
</script>

<template>
  <ContentPage>
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
        <p
          v-if="collection.timed"
          class="text-xs text-action mt-1"
        >
          ⏱ Timed — your solve times are ranked below.
        </p>

        <CollectionPuzzleList
          data-tour="collection-puzzles"
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
  </ContentPage>
</template>
