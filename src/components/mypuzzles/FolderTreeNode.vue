<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import {
  mdiChevronRight, mdiChevronDown, mdiPencilOutline, mdiTrashCanOutline, mdiFolderPlusOutline,
} from '@mdi/js'
import { FOLDER_TREE_KEY, type FolderTreeApi, type FolderNode } from './folderTree'

const props = defineProps<{ node: FolderNode; depth: number }>()

const api = inject(FOLDER_TREE_KEY) as FolderTreeApi
const expanded = ref(true)

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const count = computed(() =>
  api.countKey.value === 'collectionCount' ? props.node.collectionCount : props.node.puzzleCount,
)
const isSelected = computed(() => api.selectedId.value === props.node.id)
const isDropTarget = computed(() => api.dragId.value !== null && api.dragId.value !== props.node.id)

const ITEM = 'flex-1 flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-left transition-colors min-w-0'
</script>

<template>
  <div>
    <div
      class="group flex items-center"
      :draggable="true"
      :class="isDropTarget ? 'rounded-lg ring-1 ring-transparent hover:ring-action' : ''"
      @dragstart.stop="api.setDrag(props.node.id)"
      @dragend="api.setDrag(null)"
      @dragover.prevent
      @drop.stop.prevent="api.move(props.node.id)"
    >
      <button
        :class="[ITEM, isSelected ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper']"
        :style="{ paddingLeft: `${props.depth * 0.75 + 0.5}rem` }"
        @click="api.select(props.node.id)"
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
      <button
        class="opacity-0 group-hover:opacity-100 p-1 text-soft hover:text-action"
        title="New subfolder"
        @click="api.createChild(props.node)"
      >
        <MdiIcon
          :path="mdiFolderPlusOutline"
          :size="13"
        />
      </button>
      <button
        class="opacity-0 group-hover:opacity-100 p-1 text-soft hover:text-action"
        title="Rename"
        @click="api.rename(props.node)"
      >
        <MdiIcon
          :path="mdiPencilOutline"
          :size="13"
        />
      </button>
      <button
        class="opacity-0 group-hover:opacity-100 p-1 text-soft hover:text-red-600"
        title="Delete"
        @click="api.remove(props.node)"
      >
        <MdiIcon
          :path="mdiTrashCanOutline"
          :size="13"
        />
      </button>
    </div>

    <template v-if="expanded && hasChildren">
      <FolderTreeNode
        v-for="child in props.node.children"
        :key="child.id"
        :node="child"
        :depth="props.depth + 1"
      />
    </template>
  </div>
</template>
