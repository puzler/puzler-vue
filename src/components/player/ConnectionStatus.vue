<script setup lang="ts">
// "Reconnecting…" pill, shown when the realtime link drops during an active
// server session. Solving continues locally; edits resync once ActionCable
// reconnects. Inert for solo-local (guest, no server play) sessions.
import { usePresenceStore } from '@/stores/presence'

const presence = usePresenceStore()
</script>

<template>
  <div
    v-if="presence.playId && !presence.connected"
    class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-amber-300 text-amber-600 bg-amber-50"
    title="Reconnecting to the live session. Your progress is saved locally and will resync."
  >
    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
    Reconnecting…
  </div>
</template>
