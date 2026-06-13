<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import { apolloClient } from '@/utils/apolloClient'
import CollectionPublicDocument from '@/graphql/gql/collections/queries/CollectionPublic.graphql'
import CollectionByTokenPublicDocument from '@/graphql/gql/collections/queries/CollectionByTokenPublic.graphql'
import type {
  CollectionPublicQuery, CollectionPublicQueryVariables,
  CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables,
} from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

const route = useRoute()
const collection = ref<Collection | null>(null)
const loading = ref(true)

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))
const isSequence = computed(() => collection.value?.mode === 'sequence')

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
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <ContentPage>
    <div class="p-8 max-w-3xl mx-auto">
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
        <h1 class="font-display text-2xl font-bold">
          {{ collection.title }}
        </h1>
        <p class="text-sm text-soft mt-1">
          by {{ collection.author.username }} · {{ collection.puzzles.length }} puzzle{{ collection.puzzles.length === 1 ? '' : 's' }}
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
          Meant to be solved in order.
        </p>

        <ol class="mt-6 flex flex-col gap-3">
          <li
            v-for="(puzzle, index) in collection.puzzles"
            :key="puzzle.id"
          >
            <RouterLink
              :to="{ name: 'player', params: { id: puzzle.id } }"
              class="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
            >
              <span
                v-if="isSequence"
                class="text-sm text-faint w-5 text-right shrink-0"
              >{{ index + 1 }}</span>
              <div class="flex flex-col min-w-0 flex-1">
                <span class="font-medium text-ink-text truncate">{{ puzzle.title }}</span>
                <div
                  v-if="puzzle.constraintTypes.length"
                  class="mt-1 flex flex-wrap gap-1"
                >
                  <span
                    v-for="type in puzzle.constraintTypes.slice(0, 4)"
                    :key="type"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-line text-soft"
                  >{{ type.replace(/_/g, ' ') }}</span>
                </div>
              </div>
              <span
                v-if="puzzle.avgRating"
                class="text-xs text-faint shrink-0"
              >★ {{ puzzle.avgRating.toFixed(1) }}</span>
            </RouterLink>
          </li>
        </ol>

        <p
          v-if="!collection.puzzles.length"
          class="text-soft mt-6"
        >
          No puzzles in this collection yet.
        </p>
      </div>
    </div>
  </ContentPage>
</template>
