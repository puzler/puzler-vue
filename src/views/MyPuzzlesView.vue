<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ContentPage from '@/components/ContentPage.vue'
import PuzzlesPanel from '@/components/mypuzzles/PuzzlesPanel.vue'
import CollectionsPanel from '@/components/mypuzzles/CollectionsPanel.vue'
import SeriesPanel from '@/components/mypuzzles/SeriesPanel.vue'
import CreateCollectionDocument from '@/graphql/gql/collections/mutations/CreateCollection.graphql'
import CreateSeriesDocument from '@/graphql/gql/series/mutations/CreateSeries.graphql'
import type {
  CreateCollectionMutation, CreateCollectionMutationVariables,
  CreateSeriesMutation, CreateSeriesMutationVariables,
} from '@/graphql/generated/types'

const router = useRouter()

const tab = ref<'puzzles' | 'collections' | 'series'>('puzzles')
const TAB = 'px-3 py-1.5 text-sm transition-colors border-b-2 whitespace-nowrap'
function tabClass(name: typeof tab.value) {
  return tab.value === name ? 'text-action border-action font-medium' : 'text-soft border-transparent hover:text-ink-text'
}

// Create a new collection/series from a prompted title, then jump to its detail
// page. (Puzzle creation just opens the editor.) These live here so the single
// header button can switch its action to match the active tab.
async function createCollection() {
  const title = window.prompt('New collection title')?.trim()
  if (!title) return
  const { data } = await apolloClient.mutate<CreateCollectionMutation, CreateCollectionMutationVariables>({ mutation: CreateCollectionDocument, variables: { title } })
  const created = data?.createCollection?.collection
  if (created) router.push({ name: 'collection-detail', params: { id: created.id } })
}

async function createSeries() {
  const title = window.prompt('New series title')?.trim()
  if (!title) return
  const { data } = await apolloClient.mutate<CreateSeriesMutation, CreateSeriesMutationVariables>({ mutation: CreateSeriesDocument, variables: { title } })
  const created = data?.createSeries?.series
  if (created) router.push({ name: 'series-detail', params: { id: created.id } })
}

const newButton = computed(() => {
  if (tab.value === 'collections') return { label: 'New collection', run: createCollection }
  if (tab.value === 'series') return { label: 'New series', run: createSeries }
  return { label: 'New puzzle', run: () => router.push({ name: 'editor-new' }) }
})
</script>

<template>
  <ContentPage>
    <!-- w-full keeps this block filling the grid cell (capped at max-w-4xl);
         without it, mx-auto makes the grid item shrink-wrap its content, so the
         layout width jumps whenever the result list collapses during a refetch. -->
    <div class="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 class="font-display text-2xl font-bold">
          My Puzzles
        </h1>
        <button
          data-tour="mypuzzles-new"
          class="px-3 py-1.5 text-sm rounded-lg bg-action text-white hover:bg-action-deep shrink-0"
          @click="newButton.run()"
        >
          {{ newButton.label }}
        </button>
      </div>

      <div
        data-tour="mypuzzles-tabs"
        class="flex gap-2 mb-6 border-b border-line overflow-x-auto"
      >
        <button
          :class="[TAB, tabClass('puzzles')]"
          @click="tab = 'puzzles'"
        >
          Puzzles
        </button>
        <button
          :class="[TAB, tabClass('collections')]"
          @click="tab = 'collections'"
        >
          Collections
        </button>
        <button
          :class="[TAB, tabClass('series')]"
          @click="tab = 'series'"
        >
          Series
        </button>
      </div>

      <PuzzlesPanel v-if="tab === 'puzzles'" />
      <CollectionsPanel v-else-if="tab === 'collections'" />
      <SeriesPanel v-else />
    </div>
  </ContentPage>
</template>
