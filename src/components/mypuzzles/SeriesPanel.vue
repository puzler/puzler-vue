<script setup lang="ts">
import { useRouter } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import RowMeta from './RowMeta.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import { SERIES_VISIBILITY_OPTIONS } from '@/constants/visibility'
import MySeriesDocument from '@/graphql/gql/series/queries/MySeries.graphql'
import CreateSeriesDocument from '@/graphql/gql/series/mutations/CreateSeries.graphql'
import UpdateSeriesDocument from '@/graphql/gql/series/mutations/UpdateSeries.graphql'
import type {
  MySeriesQuery,
  CreateSeriesMutation, CreateSeriesMutationVariables,
  UpdateSeriesMutation, UpdateSeriesMutationVariables,
} from '@/graphql/generated/types'
import { SeriesVisibilityEnum } from '@/graphql/generated/types'

type MySeriesEntry = MySeriesQuery['mySeries']['nodes'][number]

const router = useRouter()

const list = useFilterableList<MySeriesQuery, MySeriesEntry>({
  query: MySeriesDocument,
  select: (d) => d.mySeries,
})

function subtext(s: MySeriesEntry) {
  const bits = [`${s.subscriberCount} subscriber${s.subscriberCount === 1 ? '' : 's'}`]
  if (s.avgRating) bits.push(`★ ${s.avgRating.toFixed(1)}`)
  if (s.solveCount) bits.push(`${s.solveCount} solve${s.solveCount === 1 ? '' : 's'}`)
  return bits.join(' · ')
}

async function createSeries() {
  const title = window.prompt('New series title')?.trim()
  if (!title) return
  const { data } = await apolloClient.mutate<CreateSeriesMutation, CreateSeriesMutationVariables>({ mutation: CreateSeriesDocument, variables: { title } })
  const created = data?.createSeries?.series
  if (created) router.push({ name: 'series-detail', params: { id: created.id } })
}

async function changeVisibility(series: MySeriesEntry, visibility: string) {
  await apolloClient.mutate<UpdateSeriesMutation, UpdateSeriesMutationVariables>({
    mutation: UpdateSeriesDocument, variables: { id: series.id, visibility: visibility as SeriesVisibilityEnum },
  })
  await list.reload()
}
</script>

<template>
  <div>
    <ListToolbar
      v-model:search="list.search.value"
      v-model:sort="list.sort.value"
      v-model:match-mode="list.matchMode.value"
      v-model:visibilities="list.visibilities.value"
      v-model:constraint-types="list.constraintTypes.value"
      :visibility-options="SERIES_VISIBILITY_OPTIONS"
    >
      <button
        class="px-3 py-1.5 text-sm rounded-lg bg-action text-white hover:bg-action-deep shrink-0"
        @click="createSeries"
      >
        New series
      </button>
    </ListToolbar>

    <p
      v-if="list.loading.value"
      class="text-soft"
    >
      Loading…
    </p>
    <p
      v-else-if="!list.nodes.value.length"
      class="text-soft"
    >
      No series match. A series is a subscribable run of puzzles and collections released over time.
    </p>
    <ul
      v-else
      class="flex flex-col gap-2"
    >
      <li
        v-for="entry in list.nodes.value"
        :key="entry.id"
        class="flex items-center gap-3 p-3 rounded-xl border border-line"
      >
        <RouterLink
          :to="{ name: 'series-detail', params: { id: entry.id } }"
          class="flex flex-col min-w-0 flex-1 hover:text-action"
        >
          <span class="font-medium text-ink-text truncate">{{ entry.title }}</span>
          <span class="text-xs text-faint">{{ entry.entryCount }} item{{ entry.entryCount === 1 ? '' : 's' }} · {{ subtext(entry) }}</span>
        </RouterLink>
        <RowMeta
          kind="series"
          :entity-id="entry.id"
          :visibility="entry.visibility"
          :share-token="entry.shareToken"
          :visibility-options="SERIES_VISIBILITY_OPTIONS"
          @update-visibility="changeVisibility(entry, $event)"
        />
      </li>
    </ul>

    <ListPagination
      :page="list.page.value"
      :total-pages="list.totalPages.value"
      :total-count="list.totalCount.value"
      @change="list.setPage"
    />
  </div>
</template>
