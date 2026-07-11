<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import CompetitionLeaderboardDocument from '@/graphql/gql/competitions/CompetitionLeaderboard.graphql'
import type {
  CompetitionLeaderboardQuery, CompetitionLeaderboardQueryVariables,
} from '@/graphql/generated/types'

// Final standings: score first, faster run breaks ties. Only finished runs
// appear, so mid-run scores never show.
const props = defineProps<{ collectionId: string; shareToken: string | null }>()

const entries = ref<CompetitionLeaderboardQuery['competitionLeaderboard']>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await apolloClient.query<CompetitionLeaderboardQuery, CompetitionLeaderboardQueryVariables>({
      query: CompetitionLeaderboardDocument,
      variables: { collectionId: props.collectionId, shareToken: props.shareToken },
      fetchPolicy: 'network-only',
    })
    entries.value = data?.competitionLeaderboard ?? []
  } finally {
    loading.value = false
  }
})

function fmtTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <section class="mt-6">
    <h2 class="text-[11px] font-semibold uppercase tracking-widest text-soft mb-2">
      Leaderboard
    </h2>
    <p
      v-if="!loading && !entries.length"
      class="text-sm text-soft"
    >
      No finished runs yet. Be the first!
    </p>
    <ol
      v-else
      class="flex flex-col gap-1.5"
    >
      <li
        v-for="entry in entries"
        :key="entry.username"
        class="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-line text-sm"
      >
        <span class="w-6 text-right font-display font-bold text-soft">{{ entry.rank }}</span>
        <RouterLink
          :to="{ name: 'profile', params: { username: entry.username } }"
          class="flex-1 truncate text-ink-text hover:text-action"
        >
          {{ entry.displayName }}
        </RouterLink>
        <span class="text-xs text-faint shrink-0">{{ entry.correctCount }} solved · {{ fmtTime(entry.timeUsedSeconds) }}</span>
        <span class="font-display font-bold text-action shrink-0">{{ entry.totalPoints }}</span>
      </li>
    </ol>
  </section>
</template>
