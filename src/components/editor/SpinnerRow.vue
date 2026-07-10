<script setup lang="ts">
import SpinnerChevronButton from './SpinnerChevronButton.vue'

// A horizontal left/value/right spinner row (the New Grid modal's linked-size
// and digit-range pickers). The vertical per-dimension spinners stay bespoke.
defineProps<{
  display: string
  decDisabled: boolean
  incDisabled: boolean
  decLabel: string
  incLabel: string
}>()

defineEmits<{ dec: []; inc: [] }>()
</script>

<template>
  <div class="flex items-center gap-3">
    <SpinnerChevronButton
      direction="left"
      :disabled="decDisabled"
      :label="decLabel"
      @click="$emit('dec')"
    />
    <span class="w-14 text-center text-lg font-semibold text-ink-text tabular-nums">
      {{ display }}
    </span>
    <SpinnerChevronButton
      direction="right"
      :disabled="incDisabled"
      :label="incLabel"
      @click="$emit('inc')"
    />
  </div>
</template>
