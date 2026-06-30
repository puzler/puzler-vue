<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { mdiFolderOutline } from '@mdi/js'
import { apolloClient } from '@/utils/apolloClient'
import ConfirmModal from '@/components/ConfirmModal.vue'
import FolderSidebar from './FolderSidebar.vue'
import MyPuzzleRow from './MyPuzzleRow.vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import MobileFilterButton from '@/components/listing/MobileFilterButton.vue'
import FilterPanel from '@/components/ui/FilterPanel.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import type { FolderNode } from './folderTree'
import { PUZZLE_VISIBILITY_OPTIONS, PUZZLE_VISIBILITY_FILTER_OPTIONS } from '@/constants/visibility'
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
const foldersOpen = ref(false)
// "all" is the default (no folder filter); anything else counts as active.
const folderActive = computed(() => (list.folderId.value !== 'all' ? 1 : 0))

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
    <FilterPanel
      :open="foldersOpen"
      title="Folders"
      tour="mypuzzles-folders"
      @close="foldersOpen = false"
    >
      <FolderSidebar
        :tree="tree"
        :selected-id="list.folderId.value"
        noun="puzzles"
        count-key="puzzleCount"
        @select="list.folderId.value = $event; foldersOpen = false"
        @changed="loadFolders"
      />
    </FilterPanel>

    <div class="flex-1 min-w-0">
      <ListToolbar
        v-model:search="list.search.value"
        v-model:sort="list.sort.value"
        v-model:match-mode="list.matchMode.value"
        v-model:visibilities="list.visibilities.value"
        v-model:constraint-types="list.constraintTypes.value"
        :supports-constraints="true"
        :visibility-options="PUZZLE_VISIBILITY_FILTER_OPTIONS"
      >
        <template #lead>
          <MobileFilterButton
            label="Folders"
            :icon="mdiFolderOutline"
            :count="folderActive"
            @open="foldersOpen = true"
          />
        </template>
      </ListToolbar>

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
        <MyPuzzleRow
          v-for="puzzle in list.nodes.value"
          :key="puzzle.id"
          :puzzle="puzzle"
          :folders="flatFolders"
          :visibility-options="PUZZLE_VISIBILITY_OPTIONS"
          @change-visibility="changeVisibility(puzzle, $event)"
          @move-to-folder="moveToFolder(puzzle, $event)"
          @delete="deleteTarget = puzzle"
        />
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
