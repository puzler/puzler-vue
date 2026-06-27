<script setup lang="ts">
import { computed } from 'vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import ArchivePuzzleCard from '@/components/archive/ArchivePuzzleCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import PuzzlesDocument from '@/graphql/gql/puzzles/queries/Puzzles.graphql'
import type { PuzzlesQuery } from '@/graphql/generated/types'

const props = defineProps<{ username: string }>()

const list = useFilterableList<PuzzlesQuery, PuzzlesQuery['puzzles']['nodes'][number]>({
  query: PuzzlesDocument,
  select: (d) => d.puzzles,
  supportsConstraints: true,
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
      :supports-constraints="true"
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
      No published puzzles yet.
    </p>
    <ul
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <li
        v-for="puzzle in list.nodes.value"
        :key="puzzle.id"
      >
        <ArchivePuzzleCard :puzzle="puzzle" />
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
