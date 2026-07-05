<script setup lang="ts">
import { computed } from 'vue'

// Shared opacity control for cosmetic color rows: a slider for dragging plus
// a number input for typing, both in 0-100 percent, emitting a 0-1 value.
// Full transparency (0) is allowed on purpose.
const props = withDefaults(
  defineProps<{
    value?: number
    label?: string
  }>(),
  { value: 1, label: 'Opacity' },
)

const emit = defineEmits<{ change: [value: number] }>()

const pct = computed(() => Math.round((props.value ?? 1) * 100))

function commit(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(raw) ? raw : 100)))
  emit('change', clamped / 100)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="text-xs text-soft">{{ label }}</label>
    <div class="flex items-center gap-2">
      <input
        type="range"
        min="0"
        max="100"
        :value="pct"
        :aria-label="label"
        class="flex-1 min-w-0 accent-action cursor-pointer touch-none py-2"
        @input="commit"
      >
      <input
        type="number"
        min="0"
        max="100"
        :value="pct"
        class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
        @change="commit"
      >
      <span class="text-xs text-faint">%</span>
    </div>
  </div>
</template>
