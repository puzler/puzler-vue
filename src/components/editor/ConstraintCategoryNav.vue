<script setup lang="ts">
// Category filter for the constraint picker, presented two ways off the same
// selected-category model: a horizontal scrollable chip row on mobile, and a
// left sidebar column on desktop. null = "All Constraints".
defineProps<{
  groups: ReadonlyArray<{ key: string; label: string }>
}>()

const model = defineModel<string | null>({ required: true })
</script>

<template>
  <!-- Mobile: horizontal chip row -->
  <div class="md:hidden flex gap-2 overflow-x-auto px-4 py-2 border-b border-line shrink-0">
    <button
      class="shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors"
      :class="model === null ? 'bg-action-tint text-action' : 'text-soft border border-line'"
      @click="model = null"
    >
      All Constraints
    </button>
    <button
      v-for="group in groups"
      :key="group.key"
      class="shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors"
      :class="model === group.key ? 'bg-action-tint text-action' : 'text-soft border border-line'"
      @click="model = group.key"
    >
      {{ group.label }}
    </button>
  </div>

  <!-- Desktop: left sidebar -->
  <aside class="hidden md:flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto py-3 pl-3 border-r border-line">
    <button
      class="w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors"
      :class="model === null ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper'"
      @click="model = null"
    >
      All Constraints
    </button>
    <button
      v-for="group in groups"
      :key="group.key"
      class="w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors"
      :class="model === group.key ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper'"
      @click="model = group.key"
    >
      {{ group.label }}
    </button>
  </aside>
</template>
