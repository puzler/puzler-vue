<script setup lang="ts">
// Roster of connected collaborators for the active play: a color swatch matching
// each one's cursor ring, a Host badge, an inline self-rename, and (for the host)
// a kick control offering Remove or Remove & block. Visible only when peers are
// present. Identity/host are server-stamped; the display name is cosmetic.
import { ref, computed } from 'vue'
import { mdiAccountMultiple } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import PlayerRow from '@/components/player/PlayerRow.vue'
import { apolloClient } from '@/utils/apolloClient'
import { usePresenceStore } from '@/stores/presence'
import { useSolveSessionStore } from '@/stores/solveSession'
import { MAX_CURSOR_RINGS } from '@/utils/cursorPalette'
import KickParticipantDocument from '@/graphql/gql/puzzles/mutations/KickParticipant.graphql'
import type { KickParticipantMutation, KickParticipantMutationVariables } from '@/graphql/generated/types'

const presence = usePresenceStore()
const session = useSolveSessionStore()

const open = ref(false)
const confirmingKick = ref<string | null>(null)

const selfId = computed(() => presence.selfActorId())
const overflow = computed(() => presence.connectedUsers.length - MAX_CURSOR_RINGS)

function swatch(actorId: string): string {
  if (actorId === selfId.value) return 'var(--color-grid-selection)'
  return presence.peerColor(actorId) ?? 'var(--color-faint)'
}

async function kick(actorId: string | null, block: boolean): Promise<void> {
  confirmingKick.value = null
  if (!actorId || !session.playId) return
  await apolloClient.mutate<KickParticipantMutation, KickParticipantMutationVariables>({
    mutation: KickParticipantDocument,
    variables: { puzzlePlayId: session.playId, actorId, block },
  })
}
</script>

<template>
  <div
    v-if="presence.hasPeers"
    class="relative self-start"
  >
    <button
      type="button"
      class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-line text-soft hover:border-action hover:text-action transition-colors"
      @click="open = !open"
    >
      <MdiIcon
        :path="mdiAccountMultiple"
        :size="13"
      />
      {{ presence.connectedUsers.length }} here
    </button>
    <div
      v-if="open"
      class="absolute left-0 mt-1 z-30 w-64 bg-surface border border-line rounded-xl shadow-lg p-2 text-left"
    >
      <ul class="flex flex-col">
        <PlayerRow
          v-for="m in presence.connectedUsers"
          :key="m.actorId"
          :member="m"
          :is-self="m.actorId === selfId"
          :color="swatch(m.actorId)"
          :can-kick="presence.isHost"
          @rename="presence.renameSelf($event)"
          @kick="confirmingKick = m.actorId"
        />
      </ul>

      <div
        v-if="confirmingKick"
        class="border-t border-line mt-1 pt-2 px-1.5 flex flex-col gap-1.5"
      >
        <p class="text-[11px] text-soft">
          Remove this player from the session?
        </p>
        <div class="flex gap-1.5">
          <button
            type="button"
            class="flex-1 text-xs px-2 py-1 rounded-lg border border-line text-ink-text hover:bg-action-tint transition-colors"
            @click="kick(confirmingKick, false)"
          >
            Remove
          </button>
          <button
            type="button"
            class="flex-1 text-xs px-2 py-1 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
            @click="kick(confirmingKick, true)"
          >
            Remove &amp; block
          </button>
        </div>
        <button
          type="button"
          class="text-[11px] text-faint hover:text-soft self-start"
          @click="confirmingKick = null"
        >
          Cancel
        </button>
      </div>

      <p
        v-if="overflow > 0"
        class="text-[10px] text-faint px-1.5 pt-1.5"
      >
        Showing rings for {{ MAX_CURSOR_RINGS }} of {{ presence.connectedUsers.length }} players.
      </p>
    </div>
  </div>
</template>
