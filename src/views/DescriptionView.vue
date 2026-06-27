<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import PuzzleBanner from '@/components/puzzle/PuzzleBanner.vue'
import PuzzlePlayRail from '@/components/puzzle/PuzzlePlayRail.vue'
import PuzzleDescriptionBody from '@/components/puzzle/PuzzleDescriptionBody.vue'
import PuzzleComments from '@/components/puzzle/PuzzleComments.vue'
import { apolloClient } from '@/utils/apolloClient'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import type { SerializedPuzzle } from '@/utils/puzzleExport'
import PuzzleDescriptionDocument from '@/graphql/gql/puzzles/queries/PuzzleDescription.graphql'
import PuzzleDescriptionByTokenDocument from '@/graphql/gql/puzzles/queries/PuzzleDescriptionByToken.graphql'
import type {
  PuzzleDescriptionQuery,
  PuzzleDescriptionQueryVariables,
  PuzzleDescriptionByTokenQuery,
  PuzzleDescriptionByTokenQueryVariables,
  PuzzleDescriptionFieldsFragment,
} from '@/graphql/generated/types'

const route = useRoute()

const loading = ref(true)
const puzzle = ref<PuzzleDescriptionFieldsFragment | null>(null)

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))

// Carry the share token and any collection context into the solver so a
// token-gated puzzle still resolves and in-collection "next puzzle" keeps working.
const playQuery = computed(() => {
  const q: Record<string, string> = {}
  for (const key of ['t', 'collection', 'ct']) {
    const value = route.query[key]
    if (typeof value === 'string') q[key] = value
  }
  return q
})

const playTo = computed(() => ({
  name: 'player',
  params: { id: puzzle.value?.id ?? '' },
  query: playQuery.value,
}))

const descriptionHtml = computed(() => sanitizeHtml(puzzle.value?.pageDescriptionHtml))

// The play-safe published definition (solution stripped) renders the start
// position thumbnail.
const thumbnailDefinition = computed(
  () => (puzzle.value?.publishedVersion?.definition as SerializedPuzzle | undefined) ?? null,
)

async function load() {
  loading.value = true
  puzzle.value = null
  const id = typeof route.params.id === 'string' ? route.params.id : null
  try {
    if (shareToken.value) {
      const { data } = await apolloClient.query<PuzzleDescriptionByTokenQuery, PuzzleDescriptionByTokenQueryVariables>({
        query: PuzzleDescriptionByTokenDocument, variables: { token: shareToken.value }, fetchPolicy: 'network-only',
      })
      puzzle.value = data?.puzzleByToken ?? null
    } else if (id) {
      const { data } = await apolloClient.query<PuzzleDescriptionQuery, PuzzleDescriptionQueryVariables>({
        query: PuzzleDescriptionDocument, variables: { id }, fetchPolicy: 'network-only',
      })
      puzzle.value = data?.puzzle ?? null
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => [route.params.id, route.query.t], load)
</script>

<template>
  <ContentPage>
    <div
      v-if="loading"
      class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-soft"
    >
      Loading…
    </div>

    <div
      v-else-if="!puzzle"
      class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-soft"
    >
      This puzzle isn’t available.
    </div>

    <!-- Single root so ContentPage's stretch-to-fill grid stretches this wrapper,
         not the banner (which would otherwise inflate with empty space). -->
    <div v-else>
      <PuzzleBanner :puzzle="puzzle" />
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6 lg:flex-row lg:gap-8 lg:items-start">
        <PuzzlePlayRail
          class="lg:order-last lg:w-80 lg:shrink-0 lg:sticky lg:top-6"
          :puzzle="puzzle"
          :play-to="playTo"
          :thumbnail-definition="thumbnailDefinition"
        />
        <div class="lg:order-first lg:flex-1 lg:min-w-0 flex flex-col gap-6">
          <PuzzleDescriptionBody
            :rules="puzzle.description"
            :html="descriptionHtml"
          />
          <PuzzleComments
            :puzzle="puzzle"
            @posted="load"
          />
        </div>
      </div>
    </div>
  </ContentPage>
</template>
