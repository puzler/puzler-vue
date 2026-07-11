<script setup lang="ts">
defineProps<{
  modes: Array<{ key: string; label: string }>
  // The effective mode (including any momentary shift override), not just
  // the sticky selection — so holding shift highlights the override
  active: string
}>()

const emit = defineEmits<{
  select: [key: string]
}>()
</script>

<template>
  <!-- flex-1 keeps segments equal when labels fit, but lets a longer label
       (e.g. Auto-Grid) widen its segment instead of wrapping or overflowing -->
  <div class="flex gap-1 p-1 rounded-lg bg-line/40">
    <button
      v-for="mode in modes"
      :key="mode.key"
      class="flex-1 py-1.5 px-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors"
      :class="active === mode.key
        ? 'bg-surface text-action shadow-sm'
        : 'text-soft hover:text-ink-text'"
      @click="emit('select', mode.key)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
