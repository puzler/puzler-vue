<script setup lang="ts">
// Appears only when another session (the user's other tab/device, or — in
// collaboration — another solver) is live on this play. Clicking it lets the
// user pause live updates on THIS device for THIS puzzle; the device stays
// connected and keeps saving its own progress.
import { ref } from 'vue'
import { useSolveSessionStore } from '@/stores/solveSession'

const session = useSolveSessionStore()
const open = ref(false)
</script>

<template>
  <div
    v-if="session.linked"
    class="relative self-start"
  >
    <button
      type="button"
      class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors"
      :class="session.liveUpdatesEnabled ? 'border-action text-action' : 'border-line text-faint'"
      :title="session.liveUpdatesEnabled ? 'Live updates on — another session is connected' : 'Live updates paused on this device'"
      @click="open = !open"
    >
      <span
        class="w-1.5 h-1.5 rounded-full"
        :class="session.liveUpdatesEnabled ? 'bg-action animate-pulse' : 'bg-faint'"
      />
      {{ session.liveUpdatesEnabled ? 'Linked' : 'Linked (paused)' }}
    </button>
    <div
      v-if="open"
      class="absolute left-0 mt-1 z-30 w-60 bg-surface border border-line rounded-xl shadow-lg p-3 text-left"
    >
      <p class="text-xs text-soft mb-2 leading-snug">
        Another tab or device is solving this puzzle.
      </p>
      <button
        type="button"
        role="switch"
        :aria-checked="session.liveUpdatesEnabled"
        class="flex items-center gap-3 w-full text-left"
        @click="session.setLiveUpdates(!session.liveUpdatesEnabled)"
      >
        <span class="flex-1 text-sm text-ink-text">Live updates on this device</span>
        <span
          class="shrink-0 w-9 h-5 rounded-full p-0.5 flex transition-colors"
          :class="session.liveUpdatesEnabled ? 'bg-action' : 'bg-line'"
        >
          <span
            class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
            :class="session.liveUpdatesEnabled ? 'translate-x-4' : 'translate-x-0'"
          />
        </span>
      </button>
    </div>
  </div>
</template>
