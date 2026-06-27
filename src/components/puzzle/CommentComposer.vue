<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import { useAuthStore } from '@/stores/auth'
import CreateCommentDocument from '@/graphql/gql/social/mutations/CreateComment.graphql'
import type { CreateCommentMutation, CreateCommentMutationVariables } from '@/graphql/generated/types'

const props = defineProps<{ puzzleId: string; gated: boolean; viewerHasSolved: boolean }>()
const emit = defineEmits<{ posted: [] }>()

const auth = useAuthStore()
const route = useRoute()
const body = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

const blockedBySolveGate = computed(() => props.gated && !props.viewerHasSolved)

async function submit() {
  const text = body.value.trim()
  if (!text) return
  submitting.value = true
  error.value = null
  try {
    const { data } = await apolloClient.mutate<CreateCommentMutation, CreateCommentMutationVariables>({
      mutation: CreateCommentDocument,
      variables: { puzzleId: props.puzzleId, body: text },
    })
    const result = data?.createComment
    if (result?.errors?.length) {
      error.value = result.errors[0]
      return
    }
    body.value = ''
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
      v-model="body"
      rows="3"
      maxlength="2000"
      placeholder="Add a comment…"
      class="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink-text focus:outline-none focus:border-action"
    />
    <div class="flex items-center gap-3">
      <button
        type="submit"
        :disabled="submitting || !body.trim()"
        class="px-4 py-2 rounded-xl bg-action text-on-action text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {{ submitting ? 'Posting…' : 'Post comment' }}
      </button>
      <span
        v-if="error"
        class="text-xs text-red-600"
      >{{ error }}</span>
    </div>
  </form>
</template>
