<script setup lang="ts">
// Shown when the host removes you from a collaborative session.
defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div class="shrink-0 bg-red-50 border-b border-red-200 text-red-700 text-sm px-4 py-2 flex items-center justify-between">
    <span>You were removed from this collaborative session. You can keep solving on your own.</span>
    <button
      class="ml-3 text-red-400 hover:text-red-600 text-lg leading-none"
      aria-label="Dismiss"
      @click="$emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>
