<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import { apolloClient } from '@/utils/apolloClient'
import MyPuzzlesDocument from '@/graphql/gql/puzzles/queries/MyPuzzles.graphql'
import type { MyPuzzlesQuery, MyPuzzlesQueryVariables } from '@/graphql/generated/types'

type MyPuzzle = MyPuzzlesQuery['myPuzzles'][number]

const puzzles = ref<MyPuzzle[]>([])
const loading = ref(true)

const VISIBILITY_LABEL: Record<string, string> = {
  private: 'Private',
  unlisted: 'Unlisted',
  public: 'Public',
  patrons_only: 'Patrons',
  subscribers_only: 'Subscribers',
}

async function load() {
  const { data } = await apolloClient.query<MyPuzzlesQuery, MyPuzzlesQueryVariables>({
    query: MyPuzzlesDocument,
    fetchPolicy: 'network-only',
  })
  puzzles.value = data?.myPuzzles ?? []
  loading.value = false
}

onMounted(load)
</script>

<template>
  <ContentPage>
    <div class="p-8 max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="font-display text-2xl font-bold">
          My Puzzles
        </h1>
        <RouterLink
          :to="{ name: 'editor-new' }"
          class="px-3 py-1.5 text-sm rounded-lg bg-action text-white hover:bg-action-deep"
        >
          New puzzle
        </RouterLink>
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
        You haven’t created any puzzles yet.
      </p>

      <ul
        v-else
        class="flex flex-col gap-2"
      >
        <li
          v-for="puzzle in puzzles"
          :key="puzzle.id"
          class="flex items-center gap-3 p-3 rounded-xl border border-line"
        >
          <div class="flex flex-col min-w-0 flex-1">
            <span class="font-medium text-ink-text truncate">{{ puzzle.title }}</span>
            <span class="text-xs text-faint">
              {{ puzzle.status === 'published' ? VISIBILITY_LABEL[puzzle.visibility] : 'Draft' }}
              <template v-if="puzzle.publishedVersion">· {{ puzzle.publishedVersion.displayName }}</template>
            </span>
          </div>
          <span
            class="text-xs px-2 py-0.5 rounded-full shrink-0"
            :class="puzzle.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-line text-soft'"
          >{{ puzzle.status === 'published' ? 'Published' : 'Draft' }}</span>
          <RouterLink
            :to="{ name: 'editor-edit', params: { id: puzzle.id } }"
            class="text-sm text-action hover:underline shrink-0"
          >
            Edit
          </RouterLink>
          <RouterLink
            v-if="puzzle.status === 'published'"
            :to="{ name: 'player', params: { id: puzzle.id }, query: { t: puzzle.shareToken } }"
            class="text-sm text-soft hover:text-action hover:underline shrink-0"
          >
            Solve
          </RouterLink>
        </li>
      </ul>
    </div>
  </ContentPage>
</template>
