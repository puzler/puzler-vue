<script setup lang="ts">
// One player setting with the author's tri-state: Allow (solver's choice),
// On (forced on), Off (forced off). Segmented control, thumb-sized targets.
const props = defineProps<{
  label: string
  hint?: string
  value: boolean | null
  disabled?: boolean
}>()
const emit = defineEmits<{ update: [value: boolean | null] }>()

const OPTIONS = [
  { value: null, label: 'Allow' },
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
] as const

function classFor(option: boolean | null): string {
  return props.value === option
    ? 'bg-action text-on-action'
    : 'text-soft hover:text-ink-text'
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
    <span class="flex-1 min-w-40">
      <span class="block text-sm text-ink-text">{{ label }}</span>
      <span
        v-if="hint"
        class="block text-xs text-faint leading-snug"
      >{{ hint }}</span>
    </span>
    <span
      class="inline-flex rounded-lg border border-line bg-surface p-0.5"
      :class="disabled ? 'opacity-40 pointer-events-none' : ''"
      role="radiogroup"
      :aria-label="label"
    >
      <button
        v-for="option in OPTIONS"
        :key="String(option.value)"
        type="button"
        role="radio"
        :aria-checked="value === option.value"
        class="px-2.5 py-1.5 min-h-9 text-xs rounded-md transition-colors"
        :class="classFor(option.value)"
        @click="emit('update', option.value)"
      >
        {{ option.label }}
      </button>
    </span>
  </div>
</template>
