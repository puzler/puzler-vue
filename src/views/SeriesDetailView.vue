<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ContentPage from '@/components/ContentPage.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import SeriesSettings from '@/components/mypuzzles/SeriesSettings.vue'
import SeriesEntryList from '@/components/mypuzzles/SeriesEntryList.vue'
import AddSeriesEntryModal from '@/components/mypuzzles/AddSeriesEntryModal.vue'
import SeriesDetailDocument from '@/graphql/gql/series/queries/SeriesDetail.graphql'
import UpdateSeriesDocument from '@/graphql/gql/series/mutations/UpdateSeries.graphql'
import DeleteSeriesDocument from '@/graphql/gql/series/mutations/DeleteSeries.graphql'
import RemoveSeriesEntryDocument from '@/graphql/gql/series/mutations/RemoveSeriesEntry.graphql'
import ReorderSeriesEntriesDocument from '@/graphql/gql/series/mutations/ReorderSeriesEntries.graphql'
import ScheduleSeriesEntryDocument from '@/graphql/gql/series/mutations/ScheduleSeriesEntry.graphql'
import type {
  SeriesDetailQuery, SeriesDetailQueryVariables,
  UpdateSeriesMutation, UpdateSeriesMutationVariables,
  DeleteSeriesMutation, DeleteSeriesMutationVariables,
  RemoveSeriesEntryMutation, RemoveSeriesEntryMutationVariables,
  ReorderSeriesEntriesMutation, ReorderSeriesEntriesMutationVariables,
  ScheduleSeriesEntryMutation, ScheduleSeriesEntryMutationVariables,
} from '@/graphql/generated/types'
import { SeriesVisibilityEnum } from '@/graphql/generated/types'

type Series = NonNullable<SeriesDetailQuery['series']>
type Attrs = Partial<Pick<UpdateSeriesMutationVariables, 'title' | 'description' | 'visibility'>>

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const series = ref<Series | null>(null)
const entries = ref<Series['entries']>([])
const loading = ref(true)
const showAdd = ref(false)
const showDelete = ref(false)

async function load() {
  const { data } = await apolloClient.query<SeriesDetailQuery, SeriesDetailQueryVariables>({
    query: SeriesDetailDocument, variables: { id }, fetchPolicy: 'network-only',
  })
  series.value = data?.series ?? null
  entries.value = series.value ? [ ...series.value.entries ] : []
  loading.value = false
}

function save(attrs: Attrs) {
  apolloClient.mutate<UpdateSeriesMutation, UpdateSeriesMutationVariables>({
    mutation: UpdateSeriesDocument, variables: { id, ...attrs },
  })
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= entries.value.length) return
  const next = [ ...entries.value ]
  ;[ next[index], next[target] ] = [ next[target], next[index] ]
  entries.value = next
  apolloClient.mutate<ReorderSeriesEntriesMutation, ReorderSeriesEntriesMutationVariables>({
    mutation: ReorderSeriesEntriesDocument, variables: { seriesId: id, orderedEntryIds: next.map((e) => e.id) },
  })
}

async function schedule(entryId: string) {
  const current = entries.value.find((e) => e.id === entryId)?.releasedAt
  const input = window.prompt('Release date (YYYY-MM-DD), or leave blank to release immediately', current ? current.slice(0, 10) : '')
  if (input === null) return
  const releasedAt = input.trim() ? new Date(`${input.trim()}T00:00:00`).toISOString() : null
  await apolloClient.mutate<ScheduleSeriesEntryMutation, ScheduleSeriesEntryMutationVariables>({
    mutation: ScheduleSeriesEntryDocument, variables: { entryId, releasedAt },
  })
  await load()
}

async function removeEntry(entryId: string) {
  await apolloClient.mutate<RemoveSeriesEntryMutation, RemoveSeriesEntryMutationVariables>({
    mutation: RemoveSeriesEntryDocument, variables: { entryId },
  })
  entries.value = entries.value.filter((e) => e.id !== entryId)
}

async function deleteSeries() {
  await apolloClient.mutate<DeleteSeriesMutation, DeleteSeriesMutationVariables>({ mutation: DeleteSeriesDocument, variables: { id } })
  router.push({ name: 'my-puzzles' })
}

const publicRoute = computed(() => ({
  name: 'series',
  params: { id },
  query: series.value?.visibility === SeriesVisibilityEnum.Unlisted && series.value.shareToken ? { t: series.value.shareToken } : {},
}))

const excludePuzzleIds = computed(() => entries.value.filter((e) => e.puzzle).map((e) => e.puzzle!.id))
const excludeCollectionIds = computed(() => entries.value.filter((e) => e.collection).map((e) => e.collection!.id))

onMounted(load)
</script>

<template>
  <ContentPage>
    <div class="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <RouterLink
        :to="{ name: 'my-puzzles' }"
        class="text-sm text-soft hover:text-action"
      >
        ← My Puzzles
      </RouterLink>

      <p
        v-if="loading"
        class="text-soft mt-4"
      >
        Loading…
      </p>
      <p
        v-else-if="!series"
        class="text-soft mt-4"
      >
        Series not found.
      </p>
      <div
        v-else
        class="mt-4 flex flex-col gap-6"
      >
        <SeriesSettings
          :title="series.title"
          :description="series.description"
          :visibility="series.visibility"
          @save="save"
        />

        <RouterLink
          v-if="series.visibility !== SeriesVisibilityEnum.Private"
          :to="publicRoute"
          class="text-sm text-action hover:underline"
        >
          View public page →
        </RouterLink>

        <SeriesEntryList
          :entries="entries"
          @move="move"
          @remove="removeEntry"
          @add="showAdd = true"
          @schedule="schedule"
        />

        <div class="pt-4 border-t border-line">
          <button
            class="text-sm text-red-600 hover:underline"
            @click="showDelete = true"
          >
            Delete series
          </button>
        </div>
      </div>

      <AddSeriesEntryModal
        v-if="showAdd && series"
        :series-id="id"
        :exclude-puzzle-ids="excludePuzzleIds"
        :exclude-collection-ids="excludeCollectionIds"
        @added="load"
        @close="showAdd = false"
      />
      <ConfirmModal
        v-if="showDelete"
        message="Delete this series? The puzzles and collections themselves are kept."
        confirm-label="Delete"
        @confirm="deleteSeries"
        @cancel="showDelete = false"
      />
    </div>
  </ContentPage>
</template>
