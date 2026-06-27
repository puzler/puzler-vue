<script setup lang="ts">
import { computed } from 'vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import ArchiveSeriesCard from '@/components/archive/ArchiveSeriesCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import PublicSeriesDocument from '@/graphql/gql/series/queries/PublicSeries.graphql'
import type { PublicSeriesQuery } from '@/graphql/generated/types'

const props = defineProps<{ username: string }>()

const list = useFilterableList<PublicSeriesQuery, PublicSeriesQuery['publicSeries']['nodes'][number]>({
  query: PublicSeriesDocument,
  select: (d) => d.publicSeries,
  authorUsername: props.username,
})

const hasResults = computed(() => list.nodes.value.length > 0)
</script>

<template>
  <div>
    <ListToolbar
      v-model:search="list.search.value"
      v-model:sort="list.sort.value"
      v-model:match-mode="list.matchMode.value"
      v-model:constraint-types="list.constraintTypes.value"
      :supports-constraints="false"
    />

    <p
      v-if="list.loading.value"
      class="text-soft"
    >
      Loading…
    </p>
    <p
      v-else-if="!hasResults"
      class="text-soft"
    >
      No public series yet.
    </p>
    <ul
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <li
        v-for="series in list.nodes.value"
        :key="series.id"
      >
        <ArchiveSeriesCard :series="series" />
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
