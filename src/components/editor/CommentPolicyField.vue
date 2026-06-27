<script setup lang="ts">
// Per-puzzle comment-gate override: inherit the account default, require a
// confirmed solve, or allow everyone.
const model = defineModel<'inherit' | 'required' | 'open'>({ required: true })

const OPTIONS = [
  { value: 'inherit', label: 'Use my account default' },
  { value: 'required', label: 'Only confirmed solvers can comment' },
  { value: 'open', label: 'Anyone can comment' },
] as const
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-xs font-semibold uppercase tracking-widest text-soft">Comments</span>
    <label
      v-for="opt in OPTIONS"
      :key="opt.value"
      class="flex items-center gap-2 text-sm text-ink-text"
    >
      <input
        v-model="model"
        type="radio"
        :value="opt.value"
      >
      {{ opt.label }}
    </label>
  </div>
</template>
