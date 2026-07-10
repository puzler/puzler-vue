<script setup lang="ts">
// One arrow button of a numeric spinner (the New Grid modal's size controls).
const DIRECTION_PATHS = {
  left: 'M15 19l-7-7 7-7',
  right: 'M9 5l7 7-7 7',
  up: 'M5 15l7-7 7 7',
  down: 'M19 9l-7 7-7-7',
} as const

defineProps<{
  direction: keyof typeof DIRECTION_PATHS
  disabled: boolean
  label: string
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="w-8 h-8 flex items-center justify-center rounded-lg text-soft hover:bg-line/60 active:bg-line disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    :disabled="disabled"
    :aria-label="label"
    @click="$emit('click')"
  >
    <svg
      class="w-4 h-4"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        :d="DIRECTION_PATHS[direction]"
      />
    </svg>
  </button>
</template>
