<script setup lang="ts">
import { mdiCodeJson, mdiRefresh, mdiClose, mdiArrowExpand, mdiArrowCollapse } from '@mdi/js'

defineProps<{
  fullscreen: boolean
  showFullscreenToggle: boolean
}>()

const emit = defineEmits<{
  refresh: []
  close: []
  'toggle-fullscreen': []
}>()

const ICON_BTN = 'p-2 rounded-lg text-soft hover:text-ink-text hover:bg-paper transition-colors'
</script>

<template>
  <div class="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-line">
    <svg
      viewBox="0 0 24 24"
      class="w-4 h-4 text-soft"
    ><path
      :d="mdiCodeJson"
      fill="currentColor"
    /></svg>
    <h2 class="text-sm font-medium text-ink-text mr-auto">
      Puzzle JSON
    </h2>
    <button
      :class="ICON_BTN"
      title="Reload from puzzle"
      aria-label="Reload from puzzle"
      @click="emit('refresh')"
    >
      <svg
        viewBox="0 0 24 24"
        class="w-4 h-4"
      ><path
        :d="mdiRefresh"
        fill="currentColor"
      /></svg>
    </button>
    <button
      v-if="showFullscreenToggle"
      :class="ICON_BTN"
      :title="fullscreen ? 'Exit full screen' : 'Full screen'"
      :aria-label="fullscreen ? 'Exit full screen' : 'Full screen'"
      @click="emit('toggle-fullscreen')"
    >
      <svg
        viewBox="0 0 24 24"
        class="w-4 h-4"
      ><path
        :d="fullscreen ? mdiArrowCollapse : mdiArrowExpand"
        fill="currentColor"
      /></svg>
    </button>
    <button
      :class="ICON_BTN"
      title="Close"
      aria-label="Close"
      @click="emit('close')"
    >
      <svg
        viewBox="0 0 24 24"
        class="w-4 h-4"
      ><path
        :d="mdiClose"
        fill="currentColor"
      /></svg>
    </button>
  </div>
</template>
