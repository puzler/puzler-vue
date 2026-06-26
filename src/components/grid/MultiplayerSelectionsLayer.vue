<script setup lang="ts">
// Collaborators' selections, rendered behind the current player's own ring.
// Inert (renders nothing) when there are no peer cursors, so editor/solo use is
// unaffected. Reads the presence store directly.
import { usePresenceStore } from '@/stores/presence'
import PeerRing from './PeerRing.vue'

const presence = usePresenceStore()
</script>

<template>
  <g>
    <PeerRing
      v-for="peer in presence.peerCursors"
      :key="peer.actorId"
      :cells="peer.cells"
      :color="peer.color"
    />
  </g>
</template>
