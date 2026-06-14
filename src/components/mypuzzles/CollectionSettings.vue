<script setup lang="ts">
defineProps<{ title: string; visibility: string; mode: string; timed: boolean }>()
const emit = defineEmits<{
  save: [attrs: { title?: string; visibility?: string; mode?: string; timed?: boolean }]
}>()

function selectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <input
      :value="title"
      class="font-display text-2xl font-bold bg-transparent focus:outline-none border-b border-transparent focus:border-line"
      @change="emit('save', { title: ($event.target as HTMLInputElement).value })"
    >
    <div class="flex flex-wrap gap-4">
      <label class="text-sm text-soft flex items-center gap-2">
        Visibility
        <select
          :value="visibility"
          class="text-sm px-2 py-1 rounded border border-line bg-surface"
          @change="emit('save', { visibility: selectValue($event) })"
        >
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
      </label>
      <label class="text-sm text-soft flex items-center gap-2">
        Order
        <select
          :value="mode"
          class="text-sm px-2 py-1 rounded border border-line bg-surface"
          @change="emit('save', { mode: selectValue($event) })"
        >
          <option value="unordered">Any order</option>
          <option value="sequence">In sequence</option>
        </select>
      </label>
      <label class="text-sm text-soft flex items-center gap-2">
        <input
          type="checkbox"
          :checked="timed"
          @change="emit('save', { timed: ($event.target as HTMLInputElement).checked })"
        >
        Timed (competition)
      </label>
    </div>
  </div>
</template>
