<script setup lang="ts">
import { computed, ref } from 'vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import MobileFilterButton from '@/components/listing/MobileFilterButton.vue'
import FilterPanel from '@/components/ui/FilterPanel.vue'
import ArchiveContainerFilterSidebar from './ArchiveContainerFilterSidebar.vue'
import ArchiveSeriesCard from './ArchiveSeriesCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import PublicSeriesDocument from '@/graphql/gql/series/queries/PublicSeries.graphql'
import type { PublicSeriesQuery } from '@/graphql/generated/types'

type ArchiveSeries = PublicSeriesQuery['publicSeries']['nodes'][number]

const list = useFilterableList<PublicSeriesQuery, ArchiveSeries>({
  query: PublicSeriesDocument,
  select: (d) => d.publicSeries,
})

const hasResults = computed(() => list.nodes.value.length > 0)

const filtersOpen = ref(false)
const activeFilters = computed(() =>
  (list.timeRange.value ? 1 : 0) + (list.setterTier.value ? 1 : 0) + (list.minRating.value ? 1 : 0),
)
</script>

<template>
  <div class="flex gap-6">
    <FilterPanel
      :open="filtersOpen"
      title="Filters"
      @close="filtersOpen = false"
    >
      <ArchiveContainerFilterSidebar
        v-model:time-range="list.timeRange.value"
        v-model:setter-tier="list.setterTier.value"
        v-model:min-rating="list.minRating.value"
      />
    </FilterPanel>

    <div class="flex-1 min-w-0">
      <ListToolbar
        v-model:search="list.search.value"
        v-model:sort="list.sort.value"
        v-model:match-mode="list.matchMode.value"
        v-model:constraint-types="list.constraintTypes.value"
        :supports-constraints="false"
      >
        <template #lead>
          <MobileFilterButton
            :count="activeFilters"
            @open="filtersOpen = true"
          />
        </template>
      </ListToolbar>

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
        No series match these filters.
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
  </div>
</template>
