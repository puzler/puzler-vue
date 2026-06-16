<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ConfirmModal from '@/components/ConfirmModal.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiPencilOutline, mdiTrashCanOutline } from '@mdi/js'
import FolderSidebar from './FolderSidebar.vue'
import FolderSelect from './FolderSelect.vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import RowMeta from './RowMeta.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import type { FolderNode } from './folderTree'
import { PUZZLE_VISIBILITY_OPTIONS, PUZZLE_VISIBILITY_FILTER_OPTIONS, VISIBILITY_LABEL } from '@/constants/visibility'
import MyPuzzlesDocument from '@/graphql/gql/puzzles/queries/MyPuzzles.graphql'
import MyFolderTreeDocument from '@/graphql/gql/collections/queries/MyFolderTree.graphql'
import MyFoldersDocument from '@/graphql/gql/collections/queries/MyFolders.graphql'
import DeletePuzzleDocument from '@/graphql/gql/puzzles/mutations/DeletePuzzle.graphql'
import MovePuzzleToFolderDocument from '@/graphql/gql/collections/mutations/MovePuzzleToFolder.graphql'
import SetPuzzleVisibilityDocument from '@/graphql/gql/puzzles/mutations/SetPuzzleVisibility.graphql'
import type {
  MyPuzzlesQuery, MyFolderTreeQuery, MyFoldersQuery, MyFoldersQueryVariables, MyFolderTreeQueryVariables,
  DeletePuzzleMutation, DeletePuzzleMutationVariables,
  MovePuzzleToFolderMutation, MovePuzzleToFolderMutationVariables,
  SetPuzzleVisibilityMutation, SetPuzzleVisibilityMutationVariables,
} from '@/graphql/generated/types'
import { PuzzleStatusEnum, PuzzleVisibilityEnum } from '@/graphql/generated/types'

type MyPuzzle = MyPuzzlesQuery['myPuzzles']['nodes'][number]

const list = useFilterableList<MyPuzzlesQuery, MyPuzzle>({
  query: MyPuzzlesDocument,
  select: (d) => d.myPuzzles,
  supportsConstraints: true,
  supportsFolders: true,
})

const tree = ref<FolderNode[]>([])
const flatFolders = ref<MyFoldersQuery['myFolders']>([])
const deleteTarget = ref<MyPuzzle | null>(null)

async function loadFolders() {
  const [t, f] = await Promise.all([
    apolloClient.query<MyFolderTreeQuery, MyFolderTreeQueryVariables>({ query: MyFolderTreeDocument, fetchPolicy: 'network-only' }),
    apolloClient.query<MyFoldersQuery, MyFoldersQueryVariables>({ query: MyFoldersDocument, fetchPolicy: 'network-only' }),
  ])
  tree.value = (t.data?.myFolderTree ?? []) as unknown as FolderNode[]
  flatFolders.value = f.data?.myFolders ?? []
}

const deleteMessage = computed(() => {
  const t = deleteTarget.value
  if (!t) return ''
  const base = `Permanently delete “${t.title}”? This can’t be undone.`
  return t.status === PuzzleStatusEnum.Published ? `${base} Any solves, comments, and ratings on it will be deleted too.` : base
})

function subtext(p: MyPuzzle) {
  if (p.status !== PuzzleStatusEnum.Published) return 'Draft'
  const bits = [VISIBILITY_LABEL[p.visibility]]
  if (p.avgRating) bits.push(`★ ${p.avgRating.toFixed(1)}`)
  if (p.solveCount) bits.push(`${p.solveCount} solve${p.solveCount === 1 ? '' : 's'}`)
  return bits.join(' · ')
}

async function moveToFolder(puzzle: MyPuzzle, folderId: string | null) {
  await apolloClient.mutate<MovePuzzleToFolderMutation, MovePuzzleToFolderMutationVariables>({
    mutation: MovePuzzleToFolderDocument, variables: { puzzleId: puzzle.id, folderId },
  })
  await Promise.all([list.reload(), loadFolders()])
}

async function changeVisibility(puzzle: MyPuzzle, visibility: string) {
  await apolloClient.mutate<SetPuzzleVisibilityMutation, SetPuzzleVisibilityMutationVariables>({
    mutation: SetPuzzleVisibilityDocument, variables: { id: puzzle.id, visibility: visibility as PuzzleVisibilityEnum },
  })
  await list.reload()
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  await apolloClient.mutate<DeletePuzzleMutation, DeletePuzzleMutationVariables>({ mutation: DeletePuzzleDocument, variables: { id: target.id } })
  deleteTarget.value = null
  await Promise.all([list.reload(), loadFolders()])
}

onMounted(loadFolders)
</script>

<template>
  <div class="flex gap-6">
    <FolderSidebar
      :tree="tree"
      :selected-id="list.folderId.value"
      noun="puzzles"
      count-key="puzzleCount"
      @select="list.folderId.value = $event"
      @changed="loadFolders"
    />

    <div class="flex-1 min-w-0">
      <ListToolbar
        v-model:search="list.search.value"
        v-model:sort="list.sort.value"
        v-model:match-mode="list.matchMode.value"
        v-model:visibilities="list.visibilities.value"
        v-model:constraint-types="list.constraintTypes.value"
        :supports-constraints="true"
        :visibility-options="PUZZLE_VISIBILITY_FILTER_OPTIONS"
      />

      <p
        v-if="list.loading.value"
        class="text-soft"
      >
        Loading…
      </p>
      <p
        v-else-if="!list.nodes.value.length"
        class="text-soft"
      >
        No puzzles match.
      </p>
      <ul
        v-else
        class="flex flex-col gap-2"
      >
        <li
          v-for="puzzle in list.nodes.value"
          :key="puzzle.id"
          class="flex items-center gap-3 p-3 rounded-xl border border-line"
        >
          <div class="flex flex-col min-w-0 flex-1">
            <span class="font-medium text-ink-text truncate">{{ puzzle.title }}</span>
            <span class="text-xs text-faint">{{ subtext(puzzle) }}</span>
          </div>
          <RowMeta
            kind="puzzle"
            :entity-id="puzzle.id"
            :visibility="puzzle.visibility"
            :share-token="puzzle.shareToken"
            :visibility-options="PUZZLE_VISIBILITY_OPTIONS"
            @update-visibility="changeVisibility(puzzle, $event)"
          />
          <FolderSelect
            :folders="flatFolders"
            :value="puzzle.folder?.id"
            @change="moveToFolder(puzzle, $event)"
          />
          <RouterLink
            :to="{ name: 'editor-edit', params: { id: puzzle.id } }"
            class="p-1.5 rounded-lg text-soft hover:text-action hover:bg-paper shrink-0"
            title="Edit"
          >
            <MdiIcon
              :path="mdiPencilOutline"
              :size="16"
            />
          </RouterLink>
          <button
            class="p-1.5 rounded-lg text-soft hover:text-red-600 hover:bg-paper shrink-0"
            title="Delete"
            @click="deleteTarget = puzzle"
          >
            <MdiIcon
              :path="mdiTrashCanOutline"
              :size="16"
            />
          </button>
        </li>
      </ul>

      <ListPagination
        :page="list.page.value"
        :total-pages="list.totalPages.value"
        :total-count="list.totalCount.value"
        @change="list.setPage"
      />
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
