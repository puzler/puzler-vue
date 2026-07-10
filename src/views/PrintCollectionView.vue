<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import RichProseBody from '@/components/RichProseBody.vue'
import PrintCoverPage from '@/components/collections/PrintCoverPage.vue'
import PrintPuzzleCard from '@/components/collections/PrintPuzzleCard.vue'
import { apolloClient } from '@/utils/apolloClient'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { collectionThemeClasses } from '@/utils/collectionTheme'
import { puzzleOrdinal, type FlowEntry } from '@/utils/collectionEntries'
import CollectionPublicDocument from '@/graphql/gql/collections/queries/CollectionPublic.graphql'
import CollectionByTokenPublicDocument from '@/graphql/gql/collections/queries/CollectionByTokenPublic.graphql'
import type {
  CollectionPublicQuery, CollectionPublicQueryVariables,
  CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables,
} from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

// The printable hand-out: what hunt setters used to build by hand in a PDF.
// Content is the viewer's server-resolved view, so gated story bodies and
// hidden entries stay out of a solver's printout while authors export it all.
const route = useRoute()
const router = useRouter()
const collection = ref<Collection | null>(null)
const loading = ref(true)

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))
const themeClasses = computed(() => (collection.value ? collectionThemeClasses(collection.value) : []))
const bodyHtml = computed(() => sanitizeHtml(collection.value?.pageDescriptionHtml ?? null))

const puzzleById = computed(() =>
  new Map((collection.value?.puzzles ?? []).map((p) => [ p.id, p ])))

function entryPuzzle(entry: FlowEntry) {
  return entry.puzzle ? puzzleById.value.get(entry.puzzle.id) ?? null : null
}

// Absolute puzzle-page URL, tokens included, for both the printed text and QR.
function puzzleUrl(puzzle: { id: string; shareToken?: string | null }): string {
  const query: Record<string, string> = {
    collection: collection.value?.id ?? '',
    ...(shareToken.value ? { ct: shareToken.value } : {}),
    ...(puzzle.shareToken ? { t: puzzle.shareToken } : {}),
  }
  return window.location.origin + router.resolve({ name: 'puzzle', params: { id: puzzle.id }, query }).href
}

function storyHtml(entry: FlowEntry): string {
  return sanitizeHtml(entry.storyPage?.bodyHtml ?? null)
}

function printPage() {
  window.print()
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
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div
    class="bg-paper min-h-screen"
    :class="themeClasses"
  >
    <div class="max-w-2xl mx-auto p-6 print:p-0">
      <div class="print:hidden flex items-center justify-between gap-3 mb-6">
        <RouterLink
          :to="{ name: 'collection', params: { id: route.params.id }, query: shareToken ? { t: shareToken } : {} }"
          class="text-sm text-soft hover:text-action"
        >
          ← Back to collection
        </RouterLink>
        <button
          class="text-sm px-3 py-1.5 rounded-lg bg-action text-on-action hover:bg-action-deep"
          @click="printPage"
        >
          Print or save as PDF
        </button>
      </div>

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
        <PrintCoverPage
          :collection="collection"
          :body-html="bodyHtml"
        />

        <ol class="flex flex-col gap-4">
          <li
            v-for="(entry, index) in collection.entries"
            :key="entry.id"
          >
            <section
              v-if="entry.entryType === 'StoryPage'"
              class="py-1"
            >
              <h2
                v-if="entry.storyTitle"
                class="font-display text-xl font-bold mb-1 break-after-avoid"
              >
                {{ entry.storyTitle }}
              </h2>
              <RichProseBody
                v-if="storyHtml(entry)"
                :html="storyHtml(entry)"
              />
              <p
                v-else-if="entry.locked"
                class="text-sm italic text-faint"
              >
                (This part of the story is still locked.)
              </p>
            </section>
            <PrintPuzzleCard
              v-else-if="entryPuzzle(entry)"
              :number="puzzleOrdinal(collection.entries, index)"
              :title="entryPuzzle(entry)!.title"
              :url="puzzleUrl(entryPuzzle(entry)!)"
              :sudokupad-url="entryPuzzle(entry)!.sudokupadUrl"
            />
          </li>
        </ol>

        <p class="text-xs text-faint mt-8 text-center">
          {{ collection.title }} · hosted on Puzler
        </p>
      </div>
    </div>
  </div>
</template>
