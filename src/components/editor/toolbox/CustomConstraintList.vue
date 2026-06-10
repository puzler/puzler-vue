<script setup lang="ts">
defineProps<{
  title: string
  modelValue: number
  min: number
  items: Array<{ id: string; label: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  add: []
  remove: [id: string]
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5 border-t border-line pt-3">
    <p class="text-xs font-medium text-soft">
      {{ title }}
    </p>
    <div class="flex items-center gap-1.5">
      <input
        type="number"
        :value="modelValue"
        :min="min"
        class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
        @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
        @keydown.enter="emit('add')"
      >
      <button
        class="text-[11px] text-action hover:text-action font-medium transition-colors"
        @click="emit('add')"
      >
        + Add
      </button>
    </div>
    <div
      v-for="item in items"
      :key="item.id"
      class="flex items-center justify-between px-2 py-0.5 rounded hover:bg-line/40 group"
    >
      <span class="text-sm text-ink-text">{{ item.label }}</span>
      <button
        class="text-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs"
        @click="emit('remove', item.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>
