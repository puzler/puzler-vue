<script setup lang="ts">
// Transient competition-submit feedback pill; never carries a verdict under
// the blind policy (the message text is decided by the caller).
defineProps<{ message: string | null }>()
</script>

<template>
  <p
    v-if="message"
    class="fixed top-16 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] px-4 py-2 rounded-xl bg-ink text-white text-sm shadow-lg"
  >
    {{ message }}
  </p>
</template>
