<script setup lang="ts">
import { ref, computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiChevronRight, mdiChevronDown } from '@mdi/js'
import type { FolderNode } from './folderTree'

// A read-only recursive folder tree for pickers (e.g. the add-to-collection
// modal). Unlike FolderTreeNode it has no drag/rename/delete — it just shows
// the structure with counts and emits the selected folder id.
const props = defineProps<{
  node: FolderNode
  depth: number
  selectedId: string
  countKey: 'puzzleCount' | 'collectionCount'
}>()
const emit = defineEmits<{ select: [id: string] }>()

const expanded = ref(true)
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const count = computed(() =>
  props.countKey === 'collectionCount' ? props.node.collectionCount : props.node.puzzleCount,
)
const isSelected = computed(() => props.selectedId === props.node.id)

const ITEM = 'flex-1 flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-left transition-colors min-w-0'
</script>

<template>
  <div>
    <button
      :class="[ITEM, isSelected ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper']"
      :style="{ paddingLeft: `${props.depth * 0.75 + 0.5}rem` }"
      @click="emit('select', props.node.id)"
    >
      <span
        class="shrink-0 -ml-1"
        :class="hasChildren ? 'cursor-pointer' : 'opacity-0'"
        @click.stop="expanded = !expanded"
      >
        <MdiIcon
          :path="expanded ? mdiChevronDown : mdiChevronRight"
          :size="14"
        />
      </span>
      <span class="flex-1 truncate">{{ props.node.name }}</span>
      <span class="text-xs text-faint">{{ count }}</span>
    </button>

    <template v-if="expanded && hasChildren">
      <FolderFilterTree
        v-for="child in props.node.children"
        :key="child.id"
        :node="child"
        :depth="props.depth + 1"
        :selected-id="props.selectedId"
        :count-key="props.countKey"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>
