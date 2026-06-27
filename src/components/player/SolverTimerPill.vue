<script setup lang="ts">
// The elapsed-time pill with a pause/resume toggle, shared by the desktop and
// mobile solver layouts. Carries the page-tour hook so the walkthrough can
// highlight it in either layout.
defineProps<{ elapsedLabel: string; paused: boolean }>()
defineEmits<{ 'toggle-pause': [] }>()
</script>

<template>
  <div
    data-tour="player-timer"
    class="shrink-0 flex items-center gap-0.5 rounded-full border border-line bg-surface pl-2.5 pr-0.5 py-0.5"
  >
    <span
      class="font-mono text-sm tabular-nums text-ink-text"
      title="Elapsed time"
    >{{ elapsedLabel }}</span>
    <button
      class="w-5 h-5 flex items-center justify-center rounded-full text-[11px] text-soft hover:text-action transition-colors"
      :title="paused ? 'Resume' : 'Pause'"
      :aria-label="paused ? 'Resume timer' : 'Pause timer'"
      @click="$emit('toggle-pause')"
    >
      {{ paused ? '▶' : '⏸' }}
    </button>
  </div>
</template>
