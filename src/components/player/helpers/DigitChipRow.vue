<script setup lang="ts">
// A labeled row of digit chips (include/exclude pickers for the sum helper).
defineProps<{
  label: string
  digits: number[]
  selected: Set<number>
  tone: 'include' | 'exclude'
}>()

defineEmits<{ toggle: [digit: number] }>()

const ON = {
  include: 'border-action bg-action-tint text-action',
  exclude: 'border-red-300 bg-red-50 text-red-700 line-through',
}
</script>

<template>
  <div class="flex items-center gap-1 flex-wrap">
    <span class="w-12 shrink-0 text-xs text-soft">{{ label }}</span>
    <button
      v-for="d in digits"
      :key="d"
      type="button"
      class="w-6 h-6 rounded-md text-xs font-medium tabular-nums border transition-colors"
      :class="selected.has(d) ? ON[tone] : 'border-line bg-surface text-soft hover:text-ink-text'"
      :aria-pressed="selected.has(d)"
      :aria-label="`${tone === 'include' ? 'Require' : 'Forbid'} digit ${d}`"
      @click="$emit('toggle', d)"
    >
      {{ d }}
    </button>
  </div>
</template>
