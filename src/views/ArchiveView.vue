<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import { apolloClient } from '@/utils/apolloClient'
import PuzzlesDocument from '@/graphql/gql/puzzles/queries/Puzzles.graphql'
import type { PuzzlesQuery, PuzzlesQueryVariables } from '@/graphql/generated/types'

type ArchivePuzzle = PuzzlesQuery['puzzles'][number]

const puzzles = ref<ArchivePuzzle[]>([])
const loading = ref(true)
const sort = ref<'newest' | 'rating' | 'popular'>('newest')

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'popular', label: 'Popular' },
] as const

async function load() {
  loading.value = true
  const { data } = await apolloClient.query<PuzzlesQuery, PuzzlesQueryVariables>({
    query: PuzzlesDocument,
    variables: { page: 1, perPage: 30, sort: sort.value },
    fetchPolicy: 'network-only',
  })
  puzzles.value = data?.puzzles ?? []
  loading.value = false
}

function setSort(value: typeof sort.value) {
  sort.value = value
  load()
}

onMounted(load)
</script>

<template>
  <ContentPage>
    <div class="p-8 max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="font-display text-2xl font-bold">
          Puzzle Archive
        </h1>
        <div class="flex gap-1">
          <button
            v-for="option in SORTS"
            :key="option.value"
            class="px-3 py-1 text-sm rounded-lg border transition-colors"
            :class="sort === option.value ? 'border-action text-action bg-action-tint' : 'border-line text-soft hover:border-action'"
            @click="setSort(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <p
        v-if="loading"
        class="text-soft"
      >
        Loading…
      </p>
      <p
        v-else-if="!puzzles.length"
        class="text-soft"
      >
        No published puzzles yet — be the first to set one!
      </p>

      <ul
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <li
          v-for="puzzle in puzzles"
          :key="puzzle.id"
        >
          <RouterLink
            :to="{ name: 'player', params: { id: puzzle.id } }"
            class="block p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
          >
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-medium text-ink-text truncate">{{ puzzle.title }}</span>
              <span
                v-if="puzzle.avgRating"
                class="text-xs text-faint shrink-0"
              >★ {{ puzzle.avgRating.toFixed(1) }}</span>
            </div>
            <span class="text-xs text-soft">by {{ puzzle.author.username }}</span>
            <div
              v-if="puzzle.constraintTypes.length"
              class="mt-2 flex flex-wrap gap-1"
            >
              <span
                v-for="type in puzzle.constraintTypes.slice(0, 4)"
                :key="type"
                class="text-[10px] px-1.5 py-0.5 rounded bg-line text-soft"
              >{{ type.replace(/_/g, ' ') }}</span>
            </div>
          </RouterLink>
        </li>
      </ul>
    </div>
  </ContentPage>
</template>
