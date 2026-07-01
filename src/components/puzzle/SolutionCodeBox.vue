<script setup lang="ts">
import { ref } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import SubmitSolutionCodeDocument from '@/graphql/gql/puzzles/mutations/SubmitSolutionCode.graphql'
import type { SubmitSolutionCodeMutation, SubmitSolutionCodeMutationVariables } from '@/graphql/generated/types'

// Lets someone who solved this puzzle off-site (SudokuPad, print, etc.) claim the
// solve by entering the setter's solution code. Shown only when the puzzle has a
// code and the viewer hasn't solved it and isn't the author (the parent gates it).
const props = defineProps<{ puzzleId: string; shareToken?: string | null }>()
const emit = defineEmits<{ solved: [] }>()

const code = ref('')
const state = ref<'idle' | 'submitting' | 'wrong'>('idle')

async function submit() {
  if (!code.value.trim() || state.value === 'submitting') return
  state.value = 'submitting'
  try {
    const { data } = await apolloClient.mutate<SubmitSolutionCodeMutation, SubmitSolutionCodeMutationVariables>({
      mutation: SubmitSolutionCodeDocument,
      variables: { puzzleId: props.puzzleId, code: code.value.trim(), shareToken: props.shareToken ?? null },
    })
    if (data?.submitSolutionCode?.solved) emit('solved')
    else state.value = 'wrong'
  } catch {
    state.value = 'wrong'
  }
}
</script>

<template>
  <div class="border-t border-line pt-3 flex flex-col gap-2">
    <span class="text-xs font-semibold uppercase tracking-widest text-soft">Solved it elsewhere?</span>
    <p class="text-xs text-soft leading-relaxed">
      Enter the setter's solution code to record your solve.
    </p>
    <div class="flex gap-2">
      <input
        v-model="code"
        type="text"
        placeholder="Solution code"
        class="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-line bg-surface text-ink-text focus:outline-none focus:border-action"
        @input="state = 'idle'"
        @keyup.enter="submit"
      >
      <button
        class="px-3 py-2 rounded-lg text-sm bg-action text-white hover:bg-action-deep transition-colors disabled:opacity-50"
        :disabled="state === 'submitting' || !code.trim()"
        @click="submit"
      >
        Submit
      </button>
    </div>
    <p
      v-if="state === 'wrong'"
      class="text-xs text-red-600"
    >
      That code doesn’t match. Double-check and try again.
    </p>
  </div>
</template>
