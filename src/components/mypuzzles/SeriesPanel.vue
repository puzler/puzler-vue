<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import MySeriesDocument from '@/graphql/gql/series/queries/MySeries.graphql'
import CreateSeriesDocument from '@/graphql/gql/series/mutations/CreateSeries.graphql'
import type {
  MySeriesQuery, MySeriesQueryVariables,
  CreateSeriesMutation, CreateSeriesMutationVariables,
} from '@/graphql/generated/types'
import { SeriesVisibilityEnum } from '@/graphql/generated/types'

const series = ref<MySeriesQuery['mySeries']>([])
const loading = ref(true)
const router = useRouter()

const VISIBILITY_LABEL: Record<string, string> = {
  [SeriesVisibilityEnum.Private]: 'Private',
  [SeriesVisibilityEnum.Unlisted]: 'Unlisted',
  [SeriesVisibilityEnum.ContainersOnly]: 'Embedded',
  [SeriesVisibilityEnum.Public]: 'Public',
  [SeriesVisibilityEnum.PatronsOnly]: 'Patrons',
  [SeriesVisibilityEnum.SubscribersOnly]: 'Subscribers',
}

async function load() {
  const { data } = await apolloClient.query<MySeriesQuery, MySeriesQueryVariables>({ query: MySeriesDocument, fetchPolicy: 'network-only' })
  series.value = data?.mySeries ?? []
  loading.value = false
}

async function createSeries() {
  const title = window.prompt('New series title')?.trim()
  if (!title) return
  const { data } = await apolloClient.mutate<CreateSeriesMutation, CreateSeriesMutationVariables>({ mutation: CreateSeriesDocument, variables: { title } })
  const created = data?.createSeries?.series
  if (created) router.push({ name: 'series-detail', params: { id: created.id } })
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex justify-end mb-4">
      <button
        class="px-3 py-1.5 text-sm rounded-lg bg-action text-white hover:bg-action-deep"
        @click="createSeries"
      >
        New series
      </button>
    </div>

    <p
      v-if="loading"
      class="text-soft"
    >
      Loading…
    </p>
    <p
      v-else-if="!series.length"
      class="text-soft"
    >
      No series yet. A series is a subscribable run of puzzles and collections released over time.
    </p>
    <ul
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <li
        v-for="entry in series"
        :key="entry.id"
      >
        <RouterLink
          :to="{ name: 'series-detail', params: { id: entry.id } }"
          class="block p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-medium text-ink-text truncate">{{ entry.title }}</span>
            <span class="text-xs text-faint shrink-0">{{ entry.entryCount }} item{{ entry.entryCount === 1 ? '' : 's' }}</span>
          </div>
          <span class="text-xs text-soft">
            {{ VISIBILITY_LABEL[entry.visibility] }} · {{ entry.subscriberCount }} subscriber{{ entry.subscriberCount === 1 ? '' : 's' }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
