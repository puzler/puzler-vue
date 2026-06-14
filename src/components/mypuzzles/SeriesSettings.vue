<script setup lang="ts">
defineProps<{ title: string; description: string | null; visibility: string }>()
const emit = defineEmits<{
  save: [attrs: { title?: string; description?: string; visibility?: string }]
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
    <textarea
      :value="description ?? ''"
      rows="2"
      placeholder="Optional description"
      class="text-sm bg-transparent border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-action resize-none"
      @change="emit('save', { description: ($event.target as HTMLTextAreaElement).value })"
    />
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
  </div>
</template>
