<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import { useAuthStore } from '@/stores/auth'
import { wrapSelectionInSpoiler } from '@/utils/spoilerMarkup'
import CreateCommentDocument from '@/graphql/gql/social/mutations/CreateComment.graphql'
import type { CreateCommentMutation, CreateCommentMutationVariables } from '@/graphql/generated/types'

const props = defineProps<{ puzzleId: string; gated: boolean; viewerHasSolved: boolean }>()
const emit = defineEmits<{ posted: [] }>()

const auth = useAuthStore()
const route = useRoute()
const body = ref('')
const spoiler = ref(false)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

const blockedBySolveGate = computed(() => props.gated && !props.viewerHasSolved)

// Wrap the textarea's selection in ||...|| (or drop an empty pair at the
// caret) and put focus back where typing should continue.
function insertSpoiler() {
  const el = textareaEl.value
  if (!el) return
  const { text, caret } = wrapSelectionInSpoiler(body.value, el.selectionStart, el.selectionEnd)
  body.value = text
  nextTick(() => {
    el.focus()
    el.setSelectionRange(caret, caret)
  })
}

async function submit() {
  const text = body.value.trim()
  if (!text) return
  submitting.value = true
  error.value = null
  try {
    const { data } = await apolloClient.mutate<CreateCommentMutation, CreateCommentMutationVariables>({
      mutation: CreateCommentDocument,
      variables: { puzzleId: props.puzzleId, body: text, spoiler: spoiler.value },
    })
    const result = data?.createComment
    if (result?.errors?.length) {
      error.value = result.errors[0]
      return
    }
    body.value = ''
    spoiler.value = false
    emit('posted')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not post comment'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <p
    v-if="!auth.isAuthenticated"
    class="text-sm text-soft"
  >
    <RouterLink
      :to="{ name: 'login', query: { redirect: route.fullPath } }"
      class="text-action hover:underline"
    >
      Log in
    </RouterLink> to leave a comment.
  </p>

  <p
    v-else-if="blockedBySolveGate"
    class="text-sm text-soft rounded-xl border border-line bg-paper px-3 py-2"
  >
    Only confirmed solvers can comment on this puzzle.
  </p>

  <form
    v-else
    class="flex flex-col gap-2"
    @submit.prevent="submit"
  >
    <textarea
      ref="textareaEl"
      v-model="body"
      rows="3"
      maxlength="2000"
      placeholder="Add a comment…"
      class="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink-text focus:outline-none focus:border-action"
    />
    <div class="flex items-center gap-x-3 gap-y-2 flex-wrap">
      <button
        type="submit"
        :disabled="submitting || !body.trim()"
        class="px-4 py-2 rounded-xl bg-action text-on-action text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {{ submitting ? 'Posting…' : 'Post comment' }}
      </button>
      <button
        type="button"
        title="Wrap the selected text in || so only solvers can read it"
        class="px-2 py-1 rounded-lg border border-line text-xs text-soft hover:text-action hover:border-action transition-colors"
        data-testid="insert-spoiler"
        @click="insertSpoiler"
      >
        Spoiler
      </button>
      <label class="inline-flex items-center gap-1.5 text-xs text-soft select-none">
        <input
          v-model="spoiler"
          type="checkbox"
          class="accent-action"
          data-testid="spoiler-checkbox"
        >
        Whole comment is a spoiler
      </label>
      <span
        v-if="error"
        class="text-xs text-red-600"
      >{{ error }}</span>
    </div>
    <p class="text-[11px] text-faint">
      Wrap text in || to hide it as a spoiler. Spoilers are only shown to people who have solved this puzzle.
    </p>
  </form>
</template>
