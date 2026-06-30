<script setup lang="ts">
import FolderFilterTree from './FolderFilterTree.vue'
import type { FolderNode } from './folderTree'

// Read-only folder picker (All / Unfiled / tree) used to filter a list by folder.
// Rendered inside FilterPanel so it works as a desktop sidebar or a mobile sheet.
const props = defineProps<{
  tree: FolderNode[]
  selectedId: string
  countKey: 'puzzleCount' | 'collectionCount'
}>()
const emit = defineEmits<{ select: [id: string] }>()

const ITEM = 'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition-colors'
function itemClass(id: string) {
  return props.selectedId === id ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper'
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <button
      :class="[ITEM, itemClass('all')]"
      @click="emit('select', 'all')"
    >
      <span class="flex-1">All puzzles</span>
    </button>
    <button
      :class="[ITEM, itemClass('unfiled')]"
      @click="emit('select', 'unfiled')"
    >
      <span class="flex-1">Unfiled</span>
    </button>

    <div
      v-if="tree.length"
      class="mt-2 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-faint"
    >
      Folders
    </div>
    <FolderFilterTree
      v-for="folder in tree"
      :key="folder.id"
      :node="folder"
      :depth="0"
      :selected-id="selectedId"
      :count-key="countKey"
      @select="emit('select', $event)"
    />
  </div>
</template>
