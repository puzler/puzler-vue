<script setup lang="ts">
// Competition-submit feedback pill; never carries a verdict under the blind
// policy (the message text is decided by the caller). Info messages are
// transient; errors persist until dismissed so a failed submission can't be
// missed.
withDefaults(defineProps<{ message: string | null; tone?: 'info' | 'error' }>(), { tone: 'info' })
defineEmits<{ dismiss: [] }>()
</script>

<template>
  <!-- Bottom-anchored so it never covers the competition bar's back link or
       the banner's submit button; info toasts are click-through on top of that
       (only the error tone carries an interactive dismiss). -->
  <p
    v-if="message"
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] px-4 py-2 rounded-xl text-white text-sm shadow-lg flex items-center gap-2"
    :class="tone === 'error' ? 'bg-red-700' : 'bg-ink pointer-events-none'"
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    {{ message }}
    <button
      v-if="tone === 'error'"
      type="button"
      class="shrink-0 -mr-1 px-1 rounded hover:bg-white/20"
      aria-label="Dismiss"
      @click="$emit('dismiss')"
    >
      &times;
    </button>
  </p>
</template>
