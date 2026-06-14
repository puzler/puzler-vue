<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import CollectionLeaderboardDocument from '@/graphql/gql/collections/queries/CollectionLeaderboard.graphql'
import type { CollectionLeaderboardQuery, CollectionLeaderboardQueryVariables } from '@/graphql/generated/types'

const props = defineProps<{ collectionId: string }>()

const entries = ref<CollectionLeaderboardQuery['collectionLeaderboard']>([])
const loaded = ref(false)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

onMounted(async () => {
  const { data } = await apolloClient.query<CollectionLeaderboardQuery, CollectionLeaderboardQueryVariables>({
    query: CollectionLeaderboardDocument, variables: { collectionId: props.collectionId }, fetchPolicy: 'network-only',
  })
  entries.value = data?.collectionLeaderboard ?? []
  loaded.value = true
})
</script>

<template>
  <div
    v-if="loaded"
    class="mt-8"
  >
    <h2 class="text-sm font-semibold text-ink-text mb-2">
      Leaderboard
    </h2>
    <p
      v-if="!entries.length"
      class="text-sm text-soft"
    >
      No completed times yet — be the first to finish the whole set.
    </p>
    <ol
      v-else
      class="flex flex-col gap-1"
    >
      <li
        v-for="entry in entries"
        :key="entry.rank"
        class="flex items-center gap-3 px-3 py-2 rounded-lg border border-line text-sm"
      >
        <span class="text-faint w-5 text-right">{{ entry.rank }}</span>
        <span class="flex-1 truncate text-ink-text">{{ entry.username }}</span>
        <span class="font-mono tabular-nums text-soft">{{ formatTime(entry.totalSeconds) }}</span>
      </li>
    </ol>
  </div>
</template>
