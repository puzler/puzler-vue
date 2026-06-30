<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import { useAuthStore } from '@/stores/auth'
import ContentPage from '@/components/ContentPage.vue'
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileStatTiles from '@/components/profile/ProfileStatTiles.vue'
import ProfilePuzzlesPanel from '@/components/profile/ProfilePuzzlesPanel.vue'
import ProfileCollectionsPanel from '@/components/profile/ProfileCollectionsPanel.vue'
import ProfileSeriesPanel from '@/components/profile/ProfileSeriesPanel.vue'
import ProfileReviewsPanel from '@/components/profile/ProfileReviewsPanel.vue'
import ProfileSolvesPanel from '@/components/profile/ProfileSolvesPanel.vue'
import ProfileFavoritesPanel from '@/components/profile/ProfileFavoritesPanel.vue'
import ProfileSubscriptionsPanel from '@/components/profile/ProfileSubscriptionsPanel.vue'
import ProfileActivityPanel from '@/components/profile/ProfileActivityPanel.vue'
import { SolveHistoryVisibilityEnum } from '@/graphql/generated/types'
import ProfileUserDocument from '@/graphql/gql/users/queries/ProfileUser.graphql'
import type { ProfileUserQuery, ProfileUserQueryVariables, PublicUserFieldsFragment } from '@/graphql/generated/types'

type TabKey = 'puzzles' | 'collections' | 'series' | 'reviews' | 'solves' | 'favorites' | 'subscriptions' | 'activity'

const route = useRoute()
const auth = useAuthStore()

const username = computed(() => route.params.username as string)
const user = ref<PublicUserFieldsFragment | null>(null)
const loading = ref(true)
const activeTab = ref<TabKey>('puzzles')

const isOwner = computed(() => auth.isAuthenticated && auth.user?.username === user.value?.username)

// A "setter" has published at least one public puzzle, collection, or series.
// Pure solvers get a trimmed profile: no empty setter tabs and no setter stats.
const isSetter = computed(() => {
  const u = user.value
  return !!u && (u.puzzleCount > 0 || u.publicCollectionCount > 0 || u.publicSeriesCount > 0)
})

const TAB = 'px-3 py-1.5 text-sm transition-colors border-b-2 whitespace-nowrap'
function tabClass(name: TabKey) {
  return activeTab.value === name
    ? 'text-action border-action font-medium'
    : 'text-soft border-transparent hover:text-ink-text'
}

// Tabs are derived from the owner's visibility preferences; the owner always
// sees every tab. The backend independently enforces each gate, so this only
// keeps empty/irrelevant tabs from showing.
const tabs = computed<{ key: TabKey; label: string }[]>(() => {
  const u = user.value
  if (!u) return []
  const vis = u.profileVisibility
  const list: { key: TabKey; label: string }[] = []
  // Setter tabs are content-driven: shown only when they actually have items, so a
  // pure solver's profile never displays empty setter sections. Reviews live on a
  // setter's public puzzles, so they only exist when there are published puzzles.
  if (u.puzzleCount > 0) list.push({ key: 'puzzles', label: 'Puzzles' })
  if (u.publicCollectionCount > 0) list.push({ key: 'collections', label: 'Collections' })
  if (u.publicSeriesCount > 0) list.push({ key: 'series', label: 'Series' })
  if (u.puzzleCount > 0) list.push({ key: 'reviews', label: 'Reviews' })
  if (isOwner.value || vis.solveHistory !== SolveHistoryVisibilityEnum.Hidden) list.push({ key: 'solves', label: 'Solves' })
  if (isOwner.value || vis.favorites) list.push({ key: 'favorites', label: 'Favorites' })
  if (isOwner.value || vis.subscriptions) list.push({ key: 'subscriptions', label: 'Subscriptions' })
  if (isOwner.value || vis.activity) list.push({ key: 'activity', label: 'Activity' })
  return list
})

// At the "count" level (and only for other viewers) the Solves tab shows just
// the number, not the list.
const solvesCountOnly = computed(
  () => !isOwner.value && user.value?.profileVisibility.solveHistory === SolveHistoryVisibilityEnum.Count,
)

async function load() {
  loading.value = true
  try {
    const { data } = await apolloClient.query<ProfileUserQuery, ProfileUserQueryVariables>({
      query: ProfileUserDocument,
      variables: { username: username.value },
      fetchPolicy: 'network-only',
    })
    user.value = data?.user ?? null
    // The Puzzles tab may not exist (pure solvers), so land on the first available tab.
    activeTab.value = tabs.value[0]?.key ?? 'puzzles'
  } finally {
    loading.value = false
  }
}

watch(username, load, { immediate: true })
</script>

<template>
  <ContentPage>
    <div class="p-4 sm:p-6 lg:p-8 w-full max-w-5xl mx-auto">
      <p
        v-if="loading"
        class="text-soft"
      >
        Loading…
      </p>

      <div v-else-if="!user">
        <h1 class="font-display text-2xl font-bold mb-2">
          Profile not found
        </h1>
        <p class="text-soft">
          No profile found for @{{ username }}.
        </p>
      </div>

      <template v-else>
        <ProfileHeader
          data-tour="profile-header"
          :user="user"
          :is-owner="isOwner"
        />

        <ProfileStatTiles
          v-if="user.profileStats && isSetter"
          :stats="user.profileStats"
          class="mt-6 block"
        />

        <div
          data-tour="profile-tabs"
          class="flex gap-2 mt-6 mb-6 border-b border-line overflow-x-auto"
        >
          <button
            v-for="t in tabs"
            :key="t.key"
            :class="[TAB, tabClass(t.key)]"
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <ProfilePuzzlesPanel
          v-if="activeTab === 'puzzles'"
          :key="`puzzles-${username}`"
          :username="username"
        />
        <ProfileCollectionsPanel
          v-else-if="activeTab === 'collections'"
          :key="`collections-${username}`"
          :username="username"
        />
        <ProfileSeriesPanel
          v-else-if="activeTab === 'series'"
          :key="`series-${username}`"
          :username="username"
        />
        <ProfileReviewsPanel
          v-else-if="activeTab === 'reviews'"
          :key="`reviews-${username}`"
          :username="username"
        />
        <template v-else-if="activeTab === 'solves'">
          <p
            v-if="solvesCountOnly"
            class="text-soft"
          >
            {{ user.solveCount }} puzzle{{ user.solveCount === 1 ? '' : 's' }} solved.
          </p>
          <ProfileSolvesPanel
            v-else
            :key="`solves-${username}`"
            :username="username"
          />
        </template>
        <ProfileFavoritesPanel
          v-else-if="activeTab === 'favorites'"
          :key="`favorites-${username}`"
          :username="username"
        />
        <ProfileSubscriptionsPanel
          v-else-if="activeTab === 'subscriptions'"
          :key="`subscriptions-${username}`"
          :username="username"
        />
        <ProfileActivityPanel
          v-else-if="activeTab === 'activity'"
          :key="`activity-${username}`"
          :username="username"
        />
      </template>
    </div>
  </ContentPage>
</template>
