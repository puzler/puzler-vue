<script setup lang="ts">
import { CollectionModeEnum, CollectionVisibilityEnum } from '@/graphql/generated/types'

defineProps<{ title: string; visibility: CollectionVisibilityEnum; mode: CollectionModeEnum; timed: boolean }>()
const emit = defineEmits<{
  save: [attrs: { title?: string; visibility?: CollectionVisibilityEnum; mode?: CollectionModeEnum; timed?: boolean }]
}>()

function selectValue<T extends string>(event: Event): T {
  return (event.target as HTMLSelectElement).value as T
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
          @change="emit('save', { visibility: selectValue<CollectionVisibilityEnum>($event) })"
        >
          <option :value="CollectionVisibilityEnum.Private">Private</option>
          <option :value="CollectionVisibilityEnum.Unlisted">Unlisted</option>
          <option :value="CollectionVisibilityEnum.ContainersOnly">In series only</option>
          <option :value="CollectionVisibilityEnum.Public">Public</option>
        </select>
      </label>
      <label class="text-sm text-soft flex items-center gap-2">
        Order
        <select
          :value="mode"
          class="text-sm px-2 py-1 rounded border border-line bg-surface"
          @change="emit('save', { mode: selectValue<CollectionModeEnum>($event) })"
        >
          <option :value="CollectionModeEnum.Unordered">Any order</option>
          <option :value="CollectionModeEnum.Sequence">In sequence</option>
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
