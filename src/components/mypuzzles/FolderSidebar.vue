<script setup lang="ts">
import { ref, toRef, provide } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import ConfirmModal from '@/components/ConfirmModal.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiFolderPlusOutline } from '@mdi/js'
import FolderTreeNode from './FolderTreeNode.vue'
import { FOLDER_TREE_KEY, type FolderNode } from './folderTree'
import CreateFolderDocument from '@/graphql/gql/collections/mutations/CreateFolder.graphql'
import RenameFolderDocument from '@/graphql/gql/collections/mutations/RenameFolder.graphql'
import DeleteFolderDocument from '@/graphql/gql/collections/mutations/DeleteFolder.graphql'
import MoveFolderDocument from '@/graphql/gql/collections/mutations/MoveFolder.graphql'
import type {
  CreateFolderMutation, CreateFolderMutationVariables,
  RenameFolderMutation, RenameFolderMutationVariables,
  DeleteFolderMutation, DeleteFolderMutationVariables,
  MoveFolderMutation, MoveFolderMutationVariables,
} from '@/graphql/generated/types'

const props = defineProps<{
  tree: FolderNode[]
  selectedId: string
  noun: 'puzzles' | 'collections'
  countKey: 'puzzleCount' | 'collectionCount'
}>()
const emit = defineEmits<{ select: [id: string]; changed: [] }>()

const deleteTarget = ref<FolderNode | null>(null)
const dragId = ref<string | null>(null)

const ITEM = 'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition-colors'
function itemClass(id: string) {
  return props.selectedId === id ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper'
}

async function createFolder(parentId: string | null) {
  const name = window.prompt(parentId ? 'New subfolder name' : 'New folder name')?.trim()
  if (!name) return
  await apolloClient.mutate<CreateFolderMutation, CreateFolderMutationVariables>({
    mutation: CreateFolderDocument, variables: { name, parentId },
  })
  emit('changed')
}

async function rename(folder: FolderNode) {
  const name = window.prompt('Rename folder', folder.name)?.trim()
  if (!name || name === folder.name) return
  await apolloClient.mutate<RenameFolderMutation, RenameFolderMutationVariables>({
    mutation: RenameFolderDocument, variables: { id: folder.id, name },
  })
  emit('changed')
}

async function confirmDelete() {
  const folder = deleteTarget.value
  if (!folder) return
  await apolloClient.mutate<DeleteFolderMutation, DeleteFolderMutationVariables>({
    mutation: DeleteFolderDocument, variables: { id: folder.id },
  })
  if (props.selectedId === folder.id) emit('select', 'all')
  deleteTarget.value = null
  emit('changed')
}

// Reparent the dragged folder under targetId (null = top level), unless it's a
// no-op or self-drop. The API rejects cycles, so a bad drop just no-ops.
async function move(targetId: string | null) {
  const id = dragId.value
  dragId.value = null
  if (!id || id === targetId) return
  await apolloClient.mutate<MoveFolderMutation, MoveFolderMutationVariables>({
    mutation: MoveFolderDocument, variables: { id, parentId: targetId },
  })
  emit('changed')
}

provide(FOLDER_TREE_KEY, {
  selectedId: toRef(props, 'selectedId'),
  countKey: toRef(props, 'countKey'),
  dragId,
  select: (id: string) => emit('select', id),
  rename,
  remove: (folder: FolderNode) => { deleteTarget.value = folder },
  createChild: (folder: FolderNode) => createFolder(folder.id),
  setDrag: (id: string | null) => { dragId.value = id },
  move,
})
</script>

<template>
  <aside class="w-56 shrink-0 flex flex-col gap-1">
    <button
      :class="[ITEM, itemClass('all')]"
      title="Drop a folder here to move it to the top level"
      @click="emit('select', 'all')"
      @dragover.prevent
      @drop.prevent="move(null)"
    >
      <span class="flex-1 capitalize">All {{ noun }}</span>
    </button>
    <button
      :class="[ITEM, itemClass('unfiled')]"
      @click="emit('select', 'unfiled')"
    >
      <span class="flex-1">Unfiled</span>
    </button>

    <div class="mt-2 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-faint">
      Folders
    </div>

    <p
      v-if="!tree.length"
      class="px-3 py-1 text-xs text-faint"
    >
      Drag a folder here to nest it. No folders yet.
    </p>
    <FolderTreeNode
      v-for="folder in tree"
      :key="folder.id"
      :node="folder"
      :depth="0"
    />

    <button
      class="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-soft hover:text-action"
      @click="createFolder(null)"
    >
      <MdiIcon
        :path="mdiFolderPlusOutline"
        :size="16"
      />
      New folder
    </button>

    <ConfirmModal
      v-if="deleteTarget"
      :message="`Delete folder “${deleteTarget.name}”? Its ${noun} are kept and just become unfiled, and any subfolders move up a level.`"
      confirm-label="Delete"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </aside>
</template>
