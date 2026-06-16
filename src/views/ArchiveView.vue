<script setup lang="ts">
import { computed } from 'vue'
import ContentPage from '@/components/ContentPage.vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import ArchiveFilterSidebar from '@/components/archive/ArchiveFilterSidebar.vue'
import ArchivePuzzleCard from '@/components/archive/ArchivePuzzleCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import { useAuthStore } from '@/stores/auth'
import PuzzlesDocument from '@/graphql/gql/puzzles/queries/Puzzles.graphql'
import type { PuzzlesQuery } from '@/graphql/generated/types'

type ArchivePuzzle = PuzzlesQuery['puzzles']['nodes'][number]

const auth = useAuthStore()

const list = useFilterableList<PuzzlesQuery, ArchivePuzzle>({
  query: PuzzlesDocument,
  select: (d) => d.puzzles,
  supportsConstraints: true,
})

const hasResults = computed(() => list.nodes.value.length > 0)
</script>

<template>
  <ContentPage>
    <div class="p-8 w-full max-w-5xl mx-auto">
      <h1 class="font-display text-2xl font-bold mb-6">
        Puzzle Archive
      </h1>

      <div class="flex gap-6">
        <ArchiveFilterSidebar
          v-model:time-range="list.timeRange.value"
          v-model:setter-tier="list.setterTier.value"
          v-model:difficulties="list.difficulties.value"
          v-model:min-rating="list.minRating.value"
          v-model:my-status="list.myStatus.value"
          v-model:featured="list.featured.value"
          v-model:tags="list.tags.value"
          v-model:grid-sizes="list.gridSizes.value"
          :show-my-status="auth.isAuthenticated"
        />

        <div class="flex-1 min-w-0">
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
            No puzzles match these filters.
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
      </div>
    </div>
  </ContentPage>
</template>
