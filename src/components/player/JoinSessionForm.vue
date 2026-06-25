<script setup lang="ts">
// Paste a share token to join someone else's play session, then navigate into
// that puzzle in join mode (PlayerView's begin() does the actual join).
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import JoinPlaySessionDocument from '@/graphql/gql/puzzles/mutations/JoinPlaySession.graphql'
import type { JoinPlaySessionMutation, JoinPlaySessionMutationVariables } from '@/graphql/generated/types'

const emit = defineEmits<{ joined: [] }>()
const router = useRouter()
const input = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

async function join() {
  const token = input.value.trim()
  if (!token) return
  busy.value = true
  error.value = null
  try {
    const { data } = await apolloClient.mutate<JoinPlaySessionMutation, JoinPlaySessionMutationVariables>({
      mutation: JoinPlaySessionDocument, variables: { token },
    })
    const play = data?.joinPlaySession?.puzzlePlay
    if (!play) { error.value = data?.joinPlaySession?.errors?.[0] ?? 'Could not join'; return }
    emit('joined')
    router.push({ name: 'player', params: { id: play.puzzle.id }, query: { join: token } })
  } catch (e) {
    error.value = (e as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ?? 'Could not join'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-2 border-t border-line pt-4">
    <p class="text-[11px] font-semibold uppercase tracking-widest text-soft">
      Join a play session
    </p>
    <div class="flex items-center gap-2">
      <input
        v-model="input"
        placeholder="Paste a token"
        class="flex-1 min-w-0 font-mono text-sm bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-ink-text"
        @keyup.enter="join"
      >
      <button
        class="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-action text-white hover:bg-action-deep transition-colors"
        :disabled="busy || !input.trim()"
        @click="join"
      >
        Join
      </button>
    </div>
    <p
      v-if="error"
      class="text-xs text-red-500"
    >
      {{ error }}
    </p>
  </section>
</template>
