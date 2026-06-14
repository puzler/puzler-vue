<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import { mdiPuzzle, mdiFolderMultiple } from '@mdi/js'
import { apolloClient } from '@/utils/apolloClient'
import { useAuthStore } from '@/stores/auth'
import SeriesPublicDocument from '@/graphql/gql/series/queries/SeriesPublic.graphql'
import SeriesByTokenPublicDocument from '@/graphql/gql/series/queries/SeriesByTokenPublic.graphql'
import ToggleSeriesSubscriptionDocument from '@/graphql/gql/series/mutations/ToggleSeriesSubscription.graphql'
import type {
  SeriesPublicQuery, SeriesPublicQueryVariables,
  SeriesByTokenPublicQuery, SeriesByTokenPublicQueryVariables,
  ToggleSeriesSubscriptionMutation, ToggleSeriesSubscriptionMutationVariables,
} from '@/graphql/generated/types'

type Series = NonNullable<SeriesPublicQuery['series']>
type Entry = Series['entries'][number]

const route = useRoute()
const auth = useAuthStore()
const series = ref<Series | null>(null)
const loading = ref(true)
const subscribed = ref(false)
const subscriberCount = ref(0)

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))

function entryLink(entry: Entry) {
  // Container-only targets expose their own share token (only because we can see
  // this series); pass it as `t` so the target page can resolve them.
  if (entry.entryType === 'Collection') {
    const token = entry.collection?.shareToken
    return { name: 'collection', params: { id: entry.collection!.id }, query: token ? { t: token } : {} }
  }
  const token = entry.puzzle?.shareToken
  return { name: 'player', params: { id: entry.puzzle!.id }, query: token ? { t: token } : {} }
}

async function load() {
  const id = typeof route.params.id === 'string' ? route.params.id : null
  try {
    if (shareToken.value) {
      const { data } = await apolloClient.query<SeriesByTokenPublicQuery, SeriesByTokenPublicQueryVariables>({
        query: SeriesByTokenPublicDocument, variables: { token: shareToken.value }, fetchPolicy: 'network-only',
      })
      series.value = data?.seriesByToken ?? null
    } else if (id) {
      const { data } = await apolloClient.query<SeriesPublicQuery, SeriesPublicQueryVariables>({
        query: SeriesPublicDocument, variables: { id }, fetchPolicy: 'network-only',
      })
      series.value = data?.series ?? null
    }
    subscribed.value = series.value?.subscribed ?? false
    subscriberCount.value = series.value?.subscriberCount ?? 0
  } finally {
    loading.value = false
  }
}

async function toggleSubscribe() {
  if (!series.value) return
  const { data } = await apolloClient.mutate<ToggleSeriesSubscriptionMutation, ToggleSeriesSubscriptionMutationVariables>({
    mutation: ToggleSeriesSubscriptionDocument, variables: { seriesId: series.value.id },
  })
  if (data?.toggleSeriesSubscription) {
    subscribed.value = data.toggleSeriesSubscription.subscribed
    subscriberCount.value = data.toggleSeriesSubscription.subscriberCount
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
        v-else-if="!series"
        class="text-soft"
      >
        This series isn’t available.
      </p>
      <div v-else>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="font-display text-2xl font-bold">
              {{ series.title }}
            </h1>
            <p class="text-sm text-soft mt-1">
              by <AuthorAttribution :author="series.author" /> · {{ subscriberCount }} subscriber{{ subscriberCount === 1 ? '' : 's' }}
            </p>
          </div>
          <button
            v-if="auth.isAuthenticated"
            class="px-3 py-1.5 text-sm rounded-lg shrink-0"
            :class="subscribed ? 'border border-line text-soft hover:text-ink-text' : 'bg-action text-white hover:bg-action-deep'"
            @click="toggleSubscribe"
          >
            {{ subscribed ? 'Subscribed ✓' : 'Subscribe' }}
          </button>
        </div>
        <p
          v-if="series.description"
          class="text-sm text-ink-text mt-3 whitespace-pre-line"
        >
          {{ series.description }}
        </p>

        <ol class="mt-6 flex flex-col gap-3">
          <li
            v-for="(entry, index) in series.entries"
            :key="entry.id"
          >
            <RouterLink
              :to="entryLink(entry)"
              class="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
            >
              <span class="text-sm text-faint w-5 text-right shrink-0">{{ index + 1 }}</span>
              <MdiIcon
                :path="entry.entryType === 'Collection' ? mdiFolderMultiple : mdiPuzzle"
                :size="16"
                class="text-faint shrink-0"
              />
              <span class="font-medium text-ink-text truncate flex-1">
                {{ entry.entryType === 'Collection' ? entry.collection?.title : entry.puzzle?.title }}
              </span>
              <span
                v-if="entry.entryType === 'Collection'"
                class="text-xs text-faint shrink-0"
              >{{ entry.collection?.puzzleCount }} puzzles</span>
            </RouterLink>
          </li>
        </ol>

        <p
          v-if="!series.entries.length"
          class="text-soft mt-6"
        >
          Nothing in this series yet.
        </p>
      </div>
    </div>
  </ContentPage>
</template>
