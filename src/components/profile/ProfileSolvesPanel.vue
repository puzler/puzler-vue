<script setup lang="ts">
import { computed } from 'vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import ArchivePuzzleCard from '@/components/archive/ArchivePuzzleCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import ProfileSolvedPuzzlesDocument from '@/graphql/gql/users/queries/ProfileSolvedPuzzles.graphql'
import type { ProfileSolvedPuzzlesQuery } from '@/graphql/generated/types'

const props = defineProps<{ username: string }>()

type SolvedNode = NonNullable<ProfileSolvedPuzzlesQuery['user']>['solvedPuzzles']['nodes'][number]

const list = useFilterableList<ProfileSolvedPuzzlesQuery, SolvedNode>({
  query: ProfileSolvedPuzzlesDocument,
  select: (d) => d.user?.solvedPuzzles,
  baseVariables: { username: props.username },
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
      No solved puzzles to show.
    </p>
    <ul
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <li
        v-for="node in list.nodes.value"
        :key="node.puzzle.id"
      >
        <ArchivePuzzleCard :puzzle="node.puzzle" />
        <div
          v-if="node.ownerRating?.stars || node.ownerReview"
          class="mt-1 px-3 py-2 rounded-lg bg-surface border border-line"
        >
          <span
            v-if="node.ownerRating?.stars"
            class="text-xs text-faint"
          >Rated ★ {{ node.ownerRating.stars }}</span>
          <p
            v-if="node.ownerReview"
            class="mt-1 text-sm text-ink-text whitespace-pre-line"
          >
            {{ node.ownerReview.body }}
          </p>
        </div>
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
