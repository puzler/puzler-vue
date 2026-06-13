<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ConfirmModal from '@/components/ConfirmModal.vue'
import FolderSidebar from './FolderSidebar.vue'
import MyPuzzlesDocument from '@/graphql/gql/puzzles/queries/MyPuzzles.graphql'
import MyFoldersDocument from '@/graphql/gql/collections/queries/MyFolders.graphql'
import DeletePuzzleDocument from '@/graphql/gql/puzzles/mutations/DeletePuzzle.graphql'
import MovePuzzleToFolderDocument from '@/graphql/gql/collections/mutations/MovePuzzleToFolder.graphql'
import type {
  MyPuzzlesQuery, MyPuzzlesQueryVariables, MyFoldersQuery, MyFoldersQueryVariables,
  DeletePuzzleMutation, DeletePuzzleMutationVariables,
  MovePuzzleToFolderMutation, MovePuzzleToFolderMutationVariables,
} from '@/graphql/generated/types'

type MyPuzzle = MyPuzzlesQuery['myPuzzles'][number]

const puzzles = ref<MyPuzzle[]>([])
const folders = ref<MyFoldersQuery['myFolders']>([])
const loading = ref(true)
const selectedFolderId = ref('all')
const deleteTarget = ref<MyPuzzle | null>(null)

const VISIBILITY_LABEL: Record<string, string> = {
  private: 'Private', unlisted: 'Unlisted', public: 'Public', patrons_only: 'Patrons', subscribers_only: 'Subscribers',
}

const unfiledCount = computed(() => puzzles.value.filter((p) => !p.folder).length)
const filtered = computed(() => {
  if (selectedFolderId.value === 'all') return puzzles.value
  if (selectedFolderId.value === 'unfiled') return puzzles.value.filter((p) => !p.folder)
  return puzzles.value.filter((p) => p.folder?.id === selectedFolderId.value)
})
const deleteMessage = computed(() => {
  const t = deleteTarget.value
  if (!t) return ''
  const base = `Permanently delete “${t.title}”? This can’t be undone.`
  return t.status === 'published' ? `${base} Any solves, comments, and ratings on it will be deleted too.` : base
})

async function load() {
  const [p, f] = await Promise.all([
    apolloClient.query<MyPuzzlesQuery, MyPuzzlesQueryVariables>({ query: MyPuzzlesDocument, fetchPolicy: 'network-only' }),
    apolloClient.query<MyFoldersQuery, MyFoldersQueryVariables>({ query: MyFoldersDocument, fetchPolicy: 'network-only' }),
  ])
  puzzles.value = p.data?.myPuzzles ?? []
  folders.value = f.data?.myFolders ?? []
  loading.value = false
}

async function moveToFolder(puzzle: MyPuzzle, folderId: string | null) {
  await apolloClient.mutate<MovePuzzleToFolderMutation, MovePuzzleToFolderMutationVariables>({
    mutation: MovePuzzleToFolderDocument, variables: { puzzleId: puzzle.id, folderId },
  })
  await load()
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  await apolloClient.mutate<DeletePuzzleMutation, DeletePuzzleMutationVariables>({ mutation: DeletePuzzleDocument, variables: { id: target.id } })
  puzzles.value = puzzles.value.filter((p) => p.id !== target.id)
  deleteTarget.value = null
}

onMounted(load)
</script>

<template>
  <div class="flex gap-6">
    <FolderSidebar
      :folders="folders"
      :selected-id="selectedFolderId"
      :total-count="puzzles.length"
      :unfiled-count="unfiledCount"
      @select="selectedFolderId = $event"
      @changed="load"
    />

    <div class="flex-1 min-w-0">
      <p
        v-if="loading"
        class="text-soft"
      >
        Loading…
      </p>
      <p
        v-else-if="!filtered.length"
        class="text-soft"
      >
        No puzzles here yet.
      </p>
      <ul
        v-else
        class="flex flex-col gap-2"
      >
        <li
          v-for="puzzle in filtered"
          :key="puzzle.id"
          class="flex items-center gap-3 p-3 rounded-xl border border-line"
        >
          <div class="flex flex-col min-w-0 flex-1">
            <span class="font-medium text-ink-text truncate">{{ puzzle.title }}</span>
            <span class="text-xs text-faint">{{ puzzle.status === 'published' ? VISIBILITY_LABEL[puzzle.visibility] : 'Draft' }}</span>
          </div>
          <select
            class="text-xs px-2 py-1 rounded border border-line bg-surface text-soft max-w-[8rem]"
            :value="puzzle.folder?.id ?? ''"
            @change="moveToFolder(puzzle, ($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">
              Unfiled
            </option>
            <option
              v-for="f in folders"
              :key="f.id"
              :value="f.id"
            >
              {{ f.name }}
            </option>
          </select>
          <RouterLink
            :to="{ name: 'editor-edit', params: { id: puzzle.id } }"
            class="text-sm text-action hover:underline shrink-0"
          >
            Edit
          </RouterLink>
          <button
            class="text-sm text-soft hover:text-red-600 hover:underline shrink-0"
            @click="deleteTarget = puzzle"
          >
            Delete
          </button>
        </li>
      </ul>
    </div>

    <ConfirmModal
      v-if="deleteTarget"
      :message="deleteMessage"
      confirm-label="Delete"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
