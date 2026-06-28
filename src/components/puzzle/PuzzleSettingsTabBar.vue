<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'

// Horizontal section tabs for the puzzle-settings modals. Scrolls sideways on
// narrow widths so the same bar works on desktop and mobile.
defineProps<{ tabs: { key: string; label: string; icon: string }[] }>()
const active = defineModel<string>({ required: true })
</script>

<template>
  <div
    class="flex gap-1 px-2 sm:px-3 border-b border-line overflow-x-auto shrink-0"
    role="tablist"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      role="tab"
      :aria-selected="active === tab.key"
      class="flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors"
      :class="active === tab.key ? 'border-action text-action font-medium' : 'border-transparent text-soft hover:text-ink-text'"
      @click="active = tab.key"
    >
      <MdiIcon
        :path="tab.icon"
        :size="17"
      />
      {{ tab.label }}
    </button>
  </div>
</template>
