<script setup lang="ts">
// Share the current in-progress play, or join someone else's. On open we ask the
// server for the play's active share token (owner only); the raw token can be
// hidden (for screen-sharing) via the "Hide share token" setting.
import { ref, computed, onMounted } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import { useSolveSessionStore } from '@/stores/solveSession'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import CopyField from '@/components/player/CopyField.vue'
import JoinSessionForm from '@/components/player/JoinSessionForm.vue'
import RevokePlaySessionDocument from '@/graphql/gql/puzzles/mutations/RevokePlaySession.graphql'
import type {
  RevokePlaySessionMutation, RevokePlaySessionMutationVariables,
} from '@/graphql/generated/types'

const props = defineProps<{ puzzleId: string | null }>()
const emit = defineEmits<{ close: [] }>()
const session = useSolveSessionStore()
const player = usePlayerSettingsStore()

const token = ref<string | null>(null)
const singleUse = ref(false)
const canShare = ref(true) // false once we learn the current user isn't the owner
const error = ref<string | null>(null)
const busy = ref(false)

const shareLink = computed(() =>
  token.value && props.puzzleId ? `${location.origin}/puzzles/${props.puzzleId}?join=${token.value}` : '')

function graphqlMessage(e: unknown): string | undefined {
  return (e as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message
}

// Generating a token also PROMOTES a guest host: the store turns their local
// session into a guest-hosted server play on the first share (see generateShareToken).
async function generate(single = singleUse.value) {
  busy.value = true
  error.value = null
  try {
    const t = await session.generateShareToken(single)
    if (t) { token.value = t.token; singleUse.value = t.singleUse }
  } catch (e) {
    if (graphqlMessage(e) === 'Not authorized') canShare.value = false
    else error.value = graphqlMessage(e) ?? 'Could not create a share link'
  } finally {
    busy.value = false
  }
}

async function revoke() {
  if (!session.playId) return
  busy.value = true
  try {
    await apolloClient.mutate<RevokePlaySessionMutation, RevokePlaySessionMutationVariables>({
      mutation: RevokePlaySessionDocument,
      variables: { puzzlePlayId: session.playId },
    })
    token.value = null
  } finally {
    busy.value = false
  }
}

onMounted(() => generate())
</script>

<template>
  <Teleport to="body">
    <div
      data-modal-open
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div class="px-6 pt-5 pb-4 border-b border-line flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-ink-text">
            Collaborate
          </h2>
          <button
            class="text-faint hover:text-soft text-xl leading-none"
            aria-label="Close"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="px-6 py-4 flex flex-col gap-5">
          <!-- Share section (owner only) -->
          <section
            v-if="canShare"
            class="flex flex-col gap-3"
          >
            <p class="text-[11px] font-semibold uppercase tracking-widest text-soft">
              Invite collaborators
            </p>
            <p
              v-if="error"
              class="text-xs text-red-500"
            >
              {{ error }}
            </p>

            <template v-if="token">
              <div :class="player.settings.hideShareToken ? 'flex items-center gap-2' : 'flex flex-col gap-3'">
                <CopyField
                  label="Share link"
                  :value="shareLink"
                  :hide-value="player.settings.hideShareToken"
                />
                <CopyField
                  label="Token"
                  :value="token"
                  mono
                  :hide-value="player.settings.hideShareToken"
                />
              </div>

              <label class="flex items-center gap-2 text-sm text-ink-text">
                <input
                  type="checkbox"
                  :checked="singleUse"
                  :disabled="busy"
                  @change="generate(!singleUse)"
                >
                Single-use (locks to the first person who joins)
              </label>

              <button
                class="self-start text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                :disabled="busy"
                @click="revoke"
              >
                Revoke &amp; remove collaborators
              </button>
            </template>
          </section>

          <!-- Join section (anyone) -->
          <JoinSessionForm @joined="emit('close')" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
