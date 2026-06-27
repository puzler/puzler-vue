<script setup lang="ts">
import { computed } from 'vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import ArchiveCollectionCard from '@/components/archive/ArchiveCollectionCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import CollectionsDocument from '@/graphql/gql/collections/queries/Collections.graphql'
import type { CollectionsQuery } from '@/graphql/generated/types'

const props = defineProps<{ username: string }>()

const list = useFilterableList<CollectionsQuery, CollectionsQuery['collections']['nodes'][number]>({
  query: CollectionsDocument,
  select: (d) => d.collections,
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
      No public collections yet.
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
</template>
