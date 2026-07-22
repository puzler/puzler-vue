<script setup lang="ts">
// One labeled number input for the sum combination helper's filter grid.
// Empty input binds '' — the parent normalizes to null.
defineProps<{
  label: string
  inputLabel: string
  disabled?: boolean
  max?: number
}>()

const model = defineModel<number | '' | null>()
</script>

<template>
  <label class="flex items-center gap-1.5 text-xs text-soft">
    <span class="w-10 shrink-0 whitespace-nowrap">{{ label }}</span>
    <input
      v-model.number="model"
      type="number"
      min="1"
      :max="max"
      :disabled="disabled"
      :aria-label="inputLabel"
      class="w-full min-w-0 rounded-md border border-line bg-surface px-1.5 py-1 text-sm text-ink-text tabular-nums focus:outline-none focus:ring-1 focus:ring-action disabled:opacity-40"
    >
  </label>
</template>
