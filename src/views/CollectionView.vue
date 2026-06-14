<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import CollectionLeaderboard from '@/components/collections/CollectionLeaderboard.vue'
import { mdiLockOutline, mdiCheckCircle } from '@mdi/js'
import { apolloClient } from '@/utils/apolloClient'
import { solvedIds } from '@/utils/solveProgress'
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
const solved = ref(new Set<string>())

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))
const isSequence = computed(() => collection.value?.mode === 'sequence')

function linkQuery(): Record<string, string> {
  if (!collection.value) return {}
  return { collection: collection.value.id, ...(shareToken.value ? { ct: shareToken.value } : {}) }
}

// In a sequence collection, a puzzle unlocks only once every earlier one is solved.
function isUnlocked(index: number): boolean {
  if (!isSequence.value || !collection.value) return true
  return collection.value.puzzles.slice(0, index).every((p) => solved.value.has(p.id))
}

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
          Solve these in order — each unlocks the next.
        </p>
        <p
          v-if="collection.timed"
          class="text-xs text-action mt-1"
        >
          ⏱ Timed — your solve times are ranked below.
        </p>

        <ol class="mt-6 flex flex-col gap-3">
          <li
            v-for="(puzzle, index) in collection.puzzles"
            :key="puzzle.id"
          >
            <RouterLink
              v-if="isUnlocked(index)"
              :to="{ name: 'player', params: { id: puzzle.id }, query: linkQuery() }"
              class="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
            >
              <span
                v-if="isSequence"
                class="text-sm text-faint w-5 text-right shrink-0"
              >{{ index + 1 }}</span>
              <span class="font-medium text-ink-text truncate flex-1">{{ puzzle.title }}</span>
              <MdiIcon
                v-if="solved.has(puzzle.id)"
                :path="mdiCheckCircle"
                :size="16"
                class="text-green-500 shrink-0"
              />
              <span
                v-else-if="puzzle.avgRating"
                class="text-xs text-faint shrink-0"
              >★ {{ puzzle.avgRating.toFixed(1) }}</span>
            </RouterLink>
            <div
              v-else
              class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-line text-faint cursor-not-allowed"
            >
              <span class="text-sm w-5 text-right shrink-0">{{ index + 1 }}</span>
              <span class="truncate flex-1">{{ puzzle.title }}</span>
              <MdiIcon
                :path="mdiLockOutline"
                :size="16"
                class="shrink-0"
              />
            </div>
          </li>
        </ol>

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
