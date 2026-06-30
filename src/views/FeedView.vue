<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiPuzzle, mdiFolderMultiple } from '@mdi/js'
import { apolloClient } from '@/utils/apolloClient'
import SeriesFeedDocument from '@/graphql/gql/series/queries/SeriesFeed.graphql'
import type { SeriesFeedQuery, SeriesFeedQueryVariables } from '@/graphql/generated/types'

type FeedItem = SeriesFeedQuery['seriesFeed'][number]

const items = ref<FeedItem[]>([])
const loading = ref(true)

function itemLink(item: FeedItem) {
  // Container-only targets carry their own share token so the target resolves.
  if (item.entryType === 'Collection') {
    const token = item.collection?.shareToken
    return { name: 'collection', params: { id: item.collection!.id }, query: token ? { t: token } : {} }
  }
  const token = item.puzzle?.shareToken
  return { name: 'puzzle', params: { id: item.puzzle!.id }, query: token ? { t: token } : {} }
}

function title(item: FeedItem): string {
  return item.entryType === 'Collection' ? (item.collection?.title ?? 'Collection') : (item.puzzle?.title ?? 'Puzzle')
}

function when(item: FeedItem): string {
  if (!item.releasedAt) return ''
  return new Date(item.releasedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function load() {
  const { data } = await apolloClient.query<SeriesFeedQuery, SeriesFeedQueryVariables>({ query: SeriesFeedDocument, fetchPolicy: 'network-only' })
  items.value = data?.seriesFeed ?? []
  loading.value = false
}

onMounted(load)
</script>

<template>
  <ContentPage>
    <div class="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <h1
        data-tour="feed-intro"
        class="font-display text-2xl font-bold"
      >
        New in your series
      </h1>
      <p class="text-sm text-soft mt-1">
        Recently released puzzles and collections from series you follow.
      </p>

      <p
        v-if="loading"
        class="text-soft mt-6"
      >
        Loading…
      </p>
      <p
        v-else-if="!items.length"
        class="text-soft mt-6"
      >
        Nothing new yet. Subscribe to a series to see its releases here.
      </p>
      <ul
        v-else
        data-tour="feed-list"
        class="mt-6 flex flex-col gap-3"
      >
        <li
          v-for="item in items"
          :key="item.id"
        >
          <RouterLink
            :to="itemLink(item)"
            class="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
          >
            <MdiIcon
              :path="item.entryType === 'Collection' ? mdiFolderMultiple : mdiPuzzle"
              :size="16"
              class="text-faint shrink-0"
            />
            <div class="flex-1 min-w-0">
              <span class="block font-medium text-ink-text truncate">{{ title(item) }}</span>
              <span class="block text-xs text-soft truncate">{{ item.seriesTitle }}</span>
            </div>
            <span class="text-xs text-faint shrink-0">{{ when(item) }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </ContentPage>
</template>
