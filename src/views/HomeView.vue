<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  mdiMagnify,
  mdiShapePlus,
  mdiViewGridOutline,
  mdiBellOutline,
  mdiAccountCircleOutline,
  mdiCogOutline,
  mdiLoginVariant,
  mdiAccountPlusOutline,
} from '@mdi/js'
import ContentPage from '@/components/ContentPage.vue'
import BrandMark from '@/components/BrandMark.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import HomePuzzleRow from '@/components/home/HomePuzzleRow.vue'
import { apolloClient } from '@/utils/apolloClient'
import { useAuthStore } from '@/stores/auth'
import { usePageTour } from '@/composables/usePageTour'
import { ListingSortEnum } from '@/graphql/generated/types'
import PuzzlesDocument from '@/graphql/gql/puzzles/queries/Puzzles.graphql'
import type { PuzzlesQuery, PuzzlesQueryVariables, PuzzleCardFieldsFragment } from '@/graphql/generated/types'

const auth = useAuthStore()

usePageTour()

type QuickLink = { to: string; label: string; description: string; icon: string }

// Links to every major area, tailored to whether the visitor is signed in.
const quickLinks = computed<QuickLink[]>(() => {
  const links: QuickLink[] = [
    { to: '/puzzles', label: 'Browse puzzles', description: 'Explore the archive by difficulty, type, and rating.', icon: mdiMagnify },
    { to: '/editor', label: 'Set a puzzle', description: 'Build your own variant sudoku from scratch.', icon: mdiShapePlus },
  ]
  if (auth.isAuthenticated) {
    links.push(
      { to: '/my-puzzles', label: 'My puzzles', description: 'Your drafts, published puzzles, collections, and series.', icon: mdiViewGridOutline },
      { to: '/feed', label: 'Updates', description: 'New releases from setters and series you follow.', icon: mdiBellOutline },
      { to: `/profile/${auth.user?.username ?? ''}`, label: 'My profile', description: 'See your public profile the way others do.', icon: mdiAccountCircleOutline },
      { to: '/settings', label: 'Settings', description: 'Appearance, privacy, account, and walkthroughs.', icon: mdiCogOutline },
    )
  } else {
    links.push(
      { to: '/login', label: 'Sign in', description: 'Already have an account? Pick up where you left off.', icon: mdiLoginVariant },
      { to: '/register', label: 'Create account', description: 'Save your progress, set puzzles, and follow setters.', icon: mdiAccountPlusOutline },
    )
  }
  return links
})

const recent = ref<PuzzleCardFieldsFragment[]>([])
const topRated = ref<PuzzleCardFieldsFragment[]>([])

async function fetchRow(sort: ListingSortEnum): Promise<PuzzleCardFieldsFragment[]> {
  try {
    const { data } = await apolloClient.query<PuzzlesQuery, PuzzlesQueryVariables>({
      query: PuzzlesDocument,
      variables: { filter: { sort, perPage: 6 } },
    })
    return data?.puzzles.nodes ?? []
  } catch {
    return []
  }
}

onMounted(async () => {
  const [r, t] = await Promise.all([fetchRow(ListingSortEnum.Recent), fetchRow(ListingSortEnum.Rating)])
  recent.value = r
  topRated.value = t
})
</script>

<template>
  <ContentPage>
    <div class="bg-canvas">
      <div class="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <!-- Hero -->
        <header class="text-center">
          <BrandMark class="w-12 h-12 mx-auto text-action" />
          <h1 class="mt-4 font-display text-4xl md:text-5xl font-bold text-ink-text">
            Puzler
          </h1>
          <p class="mt-3 text-lg text-soft">
            Create and solve variant sudoku puzzles.
          </p>
          <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
            <RouterLink
              to="/puzzles"
              class="px-6 py-3 bg-action text-white rounded-lg font-medium hover:bg-action-deep transition-colors"
            >
              Browse puzzles
            </RouterLink>
            <RouterLink
              to="/editor"
              class="px-6 py-3 border border-line rounded-lg font-medium text-ink-text hover:border-action hover:bg-action-tint transition-colors"
            >
              Set a puzzle
            </RouterLink>
          </div>
        </header>

        <!-- Quick links to every area -->
        <section class="mt-12">
          <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <li
              v-for="link in quickLinks"
              :key="link.to"
            >
              <RouterLink
                :to="link.to"
                class="flex items-start gap-3 p-4 h-full rounded-xl border border-line bg-paper hover:border-action hover:bg-action-tint transition-colors"
              >
                <MdiIcon
                  :path="link.icon"
                  :size="22"
                  class="text-action mt-0.5 shrink-0"
                />
                <span class="min-w-0">
                  <span class="block font-display font-semibold text-ink-text">{{ link.label }}</span>
                  <span class="block mt-0.5 text-sm text-soft">{{ link.description }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>
        </section>

        <HomePuzzleRow
          title="Recently published"
          :puzzles="recent"
          class="mt-12"
        />
        <HomePuzzleRow
          title="Top rated"
          :puzzles="topRated"
          class="mt-12"
        />
      </div>
    </div>
  </ContentPage>
</template>
