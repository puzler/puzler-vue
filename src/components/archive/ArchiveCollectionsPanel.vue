<script setup lang="ts">
import { computed } from 'vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import ArchiveContainerFilterSidebar from './ArchiveContainerFilterSidebar.vue'
import ArchiveCollectionCard from './ArchiveCollectionCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import CollectionsDocument from '@/graphql/gql/collections/queries/Collections.graphql'
import type { CollectionsQuery } from '@/graphql/generated/types'

type ArchiveCollection = CollectionsQuery['collections']['nodes'][number]

const list = useFilterableList<CollectionsQuery, ArchiveCollection>({
  query: CollectionsDocument,
  select: (d) => d.collections,
})

const hasResults = computed(() => list.nodes.value.length > 0)
</script>

<template>
  <div class="flex gap-6">
    <ArchiveContainerFilterSidebar
      v-model:time-range="list.timeRange.value"
      v-model:setter-tier="list.setterTier.value"
      v-model:min-rating="list.minRating.value"
    />

    <div class="flex-1 min-w-0">
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
        No collections match these filters.
      </p>
      <ul
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <li
          v-for="collection in list.nodes.value"
          :key="collection.id"
        >
          <ArchiveCollectionCard :collection="collection" />
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
