<script setup lang="ts">
import { computed } from 'vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import ArchivePuzzleCard from '@/components/archive/ArchivePuzzleCard.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import ProfileFavoritesDocument from '@/graphql/gql/users/queries/ProfileFavorites.graphql'
import type { ProfileFavoritesQuery } from '@/graphql/generated/types'

const props = defineProps<{ username: string }>()

type FavoritePuzzle = NonNullable<ProfileFavoritesQuery['user']>['favoritedPuzzles']['nodes'][number]

const list = useFilterableList<ProfileFavoritesQuery, FavoritePuzzle>({
  query: ProfileFavoritesDocument,
  select: (d) => d.user?.favoritedPuzzles,
  supportsConstraints: true,
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
      No favorited puzzles to show.
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
