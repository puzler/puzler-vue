<script setup lang="ts">
import { ref } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import ConfirmModal from '@/components/ConfirmModal.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiPencilOutline, mdiTrashCanOutline, mdiFolderPlusOutline } from '@mdi/js'
import CreateFolderDocument from '@/graphql/gql/collections/mutations/CreateFolder.graphql'
import RenameFolderDocument from '@/graphql/gql/collections/mutations/RenameFolder.graphql'
import DeleteFolderDocument from '@/graphql/gql/collections/mutations/DeleteFolder.graphql'
import type {
  MyFoldersQuery,
  CreateFolderMutation, CreateFolderMutationVariables,
  RenameFolderMutation, RenameFolderMutationVariables,
  DeleteFolderMutation, DeleteFolderMutationVariables,
} from '@/graphql/generated/types'

type Folder = MyFoldersQuery['myFolders'][number]

const props = defineProps<{
  folders: Folder[]
  selectedId: string
  totalCount: number
  unfiledCount: number
}>()
const emit = defineEmits<{ select: [id: string]; changed: [] }>()

const deleteTarget = ref<Folder | null>(null)

const ITEM = 'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition-colors'
function itemClass(id: string) {
  return props.selectedId === id ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text hover:bg-paper'
}

async function createFolder() {
  const name = window.prompt('New folder name')?.trim()
  if (!name) return
  await apolloClient.mutate<CreateFolderMutation, CreateFolderMutationVariables>({ mutation: CreateFolderDocument, variables: { name } })
  emit('changed')
}

async function rename(folder: Folder) {
  const name = window.prompt('Rename folder', folder.name)?.trim()
  if (!name || name === folder.name) return
  await apolloClient.mutate<RenameFolderMutation, RenameFolderMutationVariables>({ mutation: RenameFolderDocument, variables: { id: folder.id, name } })
  emit('changed')
}

async function confirmDelete() {
  const folder = deleteTarget.value
  if (!folder) return
  await apolloClient.mutate<DeleteFolderMutation, DeleteFolderMutationVariables>({ mutation: DeleteFolderDocument, variables: { id: folder.id } })
  if (props.selectedId === folder.id) emit('select', 'all')
  deleteTarget.value = null
  emit('changed')
}
</script>

<template>
  <aside class="w-52 shrink-0 flex flex-col gap-1">
    <button
      :class="[ITEM, itemClass('all')]"
      @click="emit('select', 'all')"
    >
      <span class="flex-1">All puzzles</span>
      <span class="text-xs text-faint">{{ totalCount }}</span>
    </button>
    <button
      :class="[ITEM, itemClass('unfiled')]"
      @click="emit('select', 'unfiled')"
    >
      <span class="flex-1">Unfiled</span>
      <span class="text-xs text-faint">{{ unfiledCount }}</span>
    </button>

    <div class="mt-2 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-faint">
      Folders
    </div>
    <div
      v-for="folder in folders"
      :key="folder.id"
      class="group flex items-center"
    >
      <button
        :class="[ITEM, itemClass(folder.id)]"
        @click="emit('select', folder.id)"
      >
        <span class="flex-1 truncate">{{ folder.name }}</span>
        <span class="text-xs text-faint">{{ folder.puzzleCount }}</span>
      </button>
      <button
        class="opacity-0 group-hover:opacity-100 p-1 text-soft hover:text-action"
        title="Rename"
        @click="rename(folder)"
      >
        <MdiIcon
          :path="mdiPencilOutline"
          :size="14"
        />
      </button>
      <button
        class="opacity-0 group-hover:opacity-100 p-1 text-soft hover:text-red-600"
        title="Delete"
        @click="deleteTarget = folder"
      >
        <MdiIcon
          :path="mdiTrashCanOutline"
          :size="14"
        />
      </button>
    </div>

    <button
      class="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-soft hover:text-action"
      @click="createFolder"
    >
      <MdiIcon
        :path="mdiFolderPlusOutline"
        :size="16"
      />
      New folder
    </button>

    <ConfirmModal
      v-if="deleteTarget"
      :message="`Delete folder “${deleteTarget.name}”? Its puzzles are kept and just become unfiled.`"
      confirm-label="Delete"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </aside>
</template>
