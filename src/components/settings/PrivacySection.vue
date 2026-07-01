<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import { SolveHistoryVisibilityEnum } from '@/graphql/generated/types'

const auth = useAuthStore()

interface VisibilityForm {
  solveHistoryVisibility: SolveHistoryVisibilityEnum
  showStats: boolean
  showFavorites: boolean
  showSubscriptions: boolean
  showActivity: boolean
}

const form = reactive<VisibilityForm>({
  solveHistoryVisibility: SolveHistoryVisibilityEnum.Count,
  showStats: true,
  showFavorites: false,
  showSubscriptions: false,
  showActivity: false,
})

const errors = ref<string[]>([])
const pending = ref(false)
const saved = ref(false)

watch(
  () => auth.user?.profileVisibility,
  (vis) => {
    if (!vis) return
    form.solveHistoryVisibility = vis.solveHistory
    form.showStats = vis.stats
    form.showFavorites = vis.favorites
    form.showSubscriptions = vis.subscriptions
    form.showActivity = vis.activity
  },
  { immediate: true, deep: true },
)

const SOLVE_OPTIONS = [
  { value: SolveHistoryVisibilityEnum.Hidden, label: 'Hidden', hint: 'Reveal nothing about the puzzles you have solved.' },
  { value: SolveHistoryVisibilityEnum.Count, label: 'Count only', hint: 'Show how many puzzles you have solved, but not which ones.' },
  { value: SolveHistoryVisibilityEnum.Puzzles, label: 'Solved puzzles', hint: 'Show the list of puzzles you have solved.' },
  {
    value: SolveHistoryVisibilityEnum.Detailed,
    label: 'Solved puzzles, ratings, and reviews',
    hint: 'Also show the ratings and reviews you left on the puzzles you solved.',
  },
]

const TOGGLES = [
  { key: 'showStats', label: 'Stats panel', hint: 'Aggregate metrics like total solves and average rating.' },
  { key: 'showFavorites', label: 'Favorites', hint: 'The puzzles you have favorited.' },
  { key: 'showSubscriptions', label: 'Subscribed series', hint: 'The series you follow.' },
  { key: 'showActivity', label: 'Activity feed', hint: 'Your recent puzzles, reviews, and solves.' },
] as const

async function save() {
  errors.value = []
  saved.value = false
  pending.value = true
  try {
    await auth.updateProfileVisibility({ ...form })
    saved.value = true
  } catch (e) {
    errors.value = e instanceof ApiError && e.errors.length ? e.errors : ['Something went wrong. Please try again.']
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="bg-paper border border-line rounded-xl p-6 mb-6">
    <h2 class="font-display text-lg font-semibold mb-1">
      Public profile
    </h2>
    <p class="text-sm text-soft mb-4">
      Control what others see on your profile. Your published puzzles, collections, series, and the reviews left on
      them are always public.
    </p>

    <form
      class="flex flex-col gap-2"
      @submit.prevent="save"
    >
      <label class="text-sm text-soft">
        Solve history
        <select
          v-model="form.solveHistoryVisibility"
          class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
        >
          <option
            v-for="option in SOLVE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <span class="block mt-1 text-xs text-faint">
          {{ SOLVE_OPTIONS.find((o) => o.value === form.solveHistoryVisibility)?.hint }}
        </span>
      </label>

      <button
        v-for="toggle in TOGGLES"
        :key="toggle.key"
        type="button"
        role="switch"
        :aria-checked="form[toggle.key]"
        :aria-label="toggle.label"
        class="flex items-center gap-3 py-2 w-full text-left border-b border-line"
        @click="form[toggle.key] = !form[toggle.key]"
      >
        <span class="flex-1 min-w-0">
          <span class="block text-sm text-ink-text">{{ toggle.label }}</span>
          <span class="block text-xs text-faint leading-snug">{{ toggle.hint }}</span>
        </span>
        <span
          class="shrink-0 w-9 h-5 rounded-full p-0.5 flex transition-colors"
          :class="form[toggle.key] ? 'bg-action' : 'bg-line'"
        >
          <span
            class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
            :class="form[toggle.key] ? 'translate-x-4' : 'translate-x-0'"
          />
        </span>
      </button>

      <ul
        v-if="errors.length"
        class="text-sm text-red-700 mt-2"
      >
        <li
          v-for="error in errors"
          :key="error"
        >
          {{ error }}
        </li>
      </ul>

      <div class="flex items-center gap-3 mt-3">
        <button
          type="submit"
          :disabled="pending"
          class="self-start px-4 py-2 rounded-lg bg-action text-on-action text-sm font-medium hover:bg-action-deep transition-colors disabled:opacity-50"
        >
          {{ pending ? 'Saving…' : 'Save visibility' }}
        </button>
        <span
          v-if="saved"
          class="text-sm text-soft"
        >Saved.</span>
      </div>
    </form>
  </section>
</template>
