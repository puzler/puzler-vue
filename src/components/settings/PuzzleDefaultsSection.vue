<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'

const auth = useAuthStore()

interface DefaultsForm {
  includeSolutionInSudokupadExport: boolean
  commentsRequireSolveDefault: boolean
}

const form = reactive<DefaultsForm>({
  includeSolutionInSudokupadExport: true,
  commentsRequireSolveDefault: false,
})

watch(
  () => auth.user?.puzzlePreferences,
  (prefs) => {
    if (!prefs) return
    form.includeSolutionInSudokupadExport = prefs.includeSolutionInSudokupadExport
    form.commentsRequireSolveDefault = prefs.commentsRequireSolveDefault
  },
  { immediate: true, deep: true },
)

const TOGGLES = [
  {
    key: 'includeSolutionInSudokupadExport',
    label: 'Include the solution in SudokuPad links',
    hint: 'Embeds the solution so SudokuPad can check solves, for your published puzzles and your own exports. Turn off to share without revealing the answer.',
  },
  {
    key: 'commentsRequireSolveDefault',
    label: 'Only confirmed solvers can comment',
    hint: 'Default for your published puzzles. You can override this per puzzle when publishing.',
  },
] as const

const errors = ref<string[]>([])
const pending = ref(false)
const saved = ref(false)

async function save() {
  errors.value = []
  saved.value = false
  pending.value = true
  try {
    await auth.updatePuzzlePreferences({ ...form })
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
      Puzzle defaults
    </h2>
    <p class="text-sm text-soft mb-4">
      Defaults applied to puzzles you publish.
    </p>

    <form
      class="flex flex-col gap-2"
      @submit.prevent="save"
    >
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

      <div class="flex items-center gap-3 mt-2">
        <button
          type="submit"
          :disabled="pending"
          class="px-4 py-2 rounded-md bg-action text-on-action text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {{ pending ? 'Saving…' : 'Save defaults' }}
        </button>
        <span
          v-if="saved"
          class="text-sm text-soft"
        >Saved.</span>
      </div>
    </form>
  </section>
</template>
