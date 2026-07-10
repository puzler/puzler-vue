<script setup lang="ts">
import { ref } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiKeyOutline } from '@mdi/js'
import SubmitCollectionCodewordDocument from '@/graphql/gql/collections/mutations/SubmitCollectionCodeword.graphql'
import type {
  SubmitCollectionCodewordMutation, SubmitCollectionCodewordMutationVariables,
} from '@/graphql/generated/types'

// The classic hunt codeword box: one input checked against every gated entry
// in the collection. A match unlocks permanently for this viewer (account or
// guest token) and the parent refetches to reveal what opened.
const props = defineProps<{ collectionId: string; shareToken: string | null }>()
const emit = defineEmits<{ unlocked: [] }>()

const guess = ref('')
const busy = ref(false)
const status = ref<'idle' | 'matched' | 'missed'>('idle')

async function submit() {
  const word = guess.value.trim()
  if (!word || busy.value) return
  busy.value = true
  try {
    const { data } = await apolloClient.mutate<SubmitCollectionCodewordMutation, SubmitCollectionCodewordMutationVariables>({
      mutation: SubmitCollectionCodewordDocument,
      variables: { collectionId: props.collectionId, guess: word, shareToken: props.shareToken },
    })
    if (data?.submitCollectionCodeword?.matched) {
      status.value = 'matched'
      guess.value = ''
      emit('unlocked')
    } else {
      status.value = 'missed'
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form
    class="mt-4 rounded-xl border border-line bg-surface p-4 flex flex-col gap-2"
    @submit.prevent="submit"
  >
    <label class="text-[11px] font-semibold uppercase tracking-widest text-soft flex items-center gap-1.5">
      <MdiIcon
        :path="mdiKeyOutline"
        :size="13"
      />
      Codeword
    </label>
    <div class="flex gap-2">
      <input
        v-model="guess"
        placeholder="Found a codeword? Enter it here"
        class="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-lg border border-line bg-paper text-ink-text focus:outline-none focus:border-action"
        @input="status = 'idle'"
      >
      <button
        type="submit"
        class="text-sm px-3 py-1.5 rounded-lg bg-action text-on-action hover:bg-action-deep disabled:opacity-50 shrink-0"
        :disabled="busy || !guess.trim()"
      >
        Try it
      </button>
    </div>
    <p
      v-if="status === 'matched'"
      class="text-xs text-action"
    >
      Something unlocked!
    </p>
    <p
      v-else-if="status === 'missed'"
      class="text-xs text-red-600"
    >
      Nothing matches that codeword. Keep hunting.
    </p>
  </form>
</template>
