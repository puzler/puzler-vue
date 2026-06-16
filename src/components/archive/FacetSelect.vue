<script setup lang="ts" generic="T extends string | number">
// A labeled single-select facet rendered as a vertical list of pill buttons,
// with an optional leading "Any" choice that maps to null.
const props = withDefaults(defineProps<{
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  includeAny?: boolean
  anyLabel?: string
}>(), { includeAny: true, anyLabel: 'Any' })

const model = defineModel<T | null>({ required: true })

const ITEM = 'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors'
function itemClass(active: boolean) {
  return active ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper'
}
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <p class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-faint">
      {{ props.label }}
    </p>
    <button
      v-if="props.includeAny"
      :class="[ITEM, itemClass(model === null)]"
      @click="model = null"
    >
      {{ props.anyLabel }}
    </button>
    <button
      v-for="opt in props.options"
      :key="String(opt.value)"
      :class="[ITEM, itemClass(model === opt.value)]"
      @click="model = opt.value"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
