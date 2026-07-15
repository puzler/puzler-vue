<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import PatronBadge from '@/components/patreon/PatronBadge.vue'
import { mdiPuzzle, mdiFolderMultiple } from '@mdi/js'
import { apolloClient } from '@/utils/apolloClient'
import { useAuthStore } from '@/stores/auth'
import { seriesFeedRows, patronFeedRows, mergeFeeds, type FeedRow } from '@/utils/feedMerge'
import SeriesFeedDocument from '@/graphql/gql/series/queries/SeriesFeed.graphql'
import PatronFeedDocument from '@/graphql/gql/social/queries/PatronFeed.graphql'
import type { SeriesFeedQuery, PatronFeedQuery } from '@/graphql/generated/types'

// The Updates page: one merged, newest-first list of releases from series the
// viewer follows and creators they support on Patreon.
const auth = useAuthStore()
const items = ref<FeedRow[]>([])
const loading = ref(true)

function when(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function load() {
  // The patron query only runs for viewers with memberships — zero extra
  // requests for everyone else.
  const wantsPatron = auth.patronMemberships.length > 0
  const [seriesResult, patronResult] = await Promise.all([
    apolloClient.query<SeriesFeedQuery>({ query: SeriesFeedDocument, fetchPolicy: 'network-only' }),
    wantsPatron
      ? apolloClient.query<PatronFeedQuery>({ query: PatronFeedDocument, fetchPolicy: 'network-only' })
      : Promise.resolve(null),
  ])
  items.value = mergeFeeds(
    seriesFeedRows(seriesResult.data?.seriesFeed ?? []),
    patronFeedRows(patronResult?.data?.patronReleases ?? []),
  )
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
        Updates
      </h1>
      <p class="text-sm text-soft mt-1">
        New releases from series you follow and creators you support.
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
        Nothing new yet. Subscribe to a series or support a creator on Patreon to see releases here.
      </p>
      <ul
        v-else
        data-tour="feed-list"
        class="mt-6 flex flex-col gap-3"
      >
        <li
          v-for="item in items"
          :key="item.key"
        >
          <RouterLink
            :to="item.link"
            class="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
          >
            <MdiIcon
              :path="item.kind === 'collection' ? mdiFolderMultiple : mdiPuzzle"
              :size="16"
              class="text-faint shrink-0"
            />
            <div class="flex-1 min-w-0">
              <span class="block font-medium text-ink-text truncate">{{ item.title }}</span>
              <span class="block text-xs text-soft truncate">{{ item.sourceLabel }}</span>
            </div>
            <PatronBadge
              v-if="item.patron"
              :locked="item.locked"
            />
            <span class="text-xs text-faint shrink-0">{{ when(item.releasedAt) }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </ContentPage>
</template>
