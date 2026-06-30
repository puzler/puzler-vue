<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { mdiFolderOutline } from '@mdi/js'
import { apolloClient } from '@/utils/apolloClient'
import BaseModal from '@/components/ui/BaseModal.vue'
import FilterPanel from '@/components/ui/FilterPanel.vue'
import MobileFilterButton from '@/components/listing/MobileFilterButton.vue'
import FolderFilterList from './FolderFilterList.vue'
import MyPuzzlesDocument from '@/graphql/gql/puzzles/queries/MyPuzzles.graphql'
import MyFolderTreeDocument from '@/graphql/gql/collections/queries/MyFolderTree.graphql'
import AddPuzzleToCollectionDocument from '@/graphql/gql/collections/mutations/AddPuzzleToCollection.graphql'
import type { FolderNode } from './folderTree'
import type {
  MyPuzzlesQuery, MyPuzzlesQueryVariables,
  MyFolderTreeQuery, MyFolderTreeQueryVariables,
  AddPuzzleToCollectionMutation, AddPuzzleToCollectionMutationVariables,
} from '@/graphql/generated/types'

const props = defineProps<{ collectionId: string; excludeIds: string[] }>()
const emit = defineEmits<{ added: []; close: [] }>()

const puzzles = ref<MyPuzzlesQuery['myPuzzles']['nodes']>([])
const tree = ref<FolderNode[]>([])
const folderId = ref<string>('all')
const foldersOpen = ref(false)
const loading = ref(true)
const added = ref(new Set<string>())
const busy = ref<string | null>(null)

const available = computed(() =>
  puzzles.value.filter((p) => !props.excludeIds.includes(p.id) && !added.value.has(p.id)),
)

async function loadFolders() {
  const { data } = await apolloClient.query<MyFolderTreeQuery, MyFolderTreeQueryVariables>({
    query: MyFolderTreeDocument, fetchPolicy: 'network-only',
  })
  tree.value = (data?.myFolderTree ?? []) as unknown as FolderNode[]
}

async function loadPuzzles() {
  // The picker shows the selected folder's puzzles at once; request a large
  // page so the paginated myPuzzles query returns everything in that folder.
  // folderId 'all'/'unfiled'/<id> is handled server-side, same as My Puzzles.
  loading.value = true
  try {
    const { data } = await apolloClient.query<MyPuzzlesQuery, MyPuzzlesQueryVariables>({
      query: MyPuzzlesDocument,
      variables: { filter: { perPage: 200, folderId: folderId.value } },
      fetchPolicy: 'network-only',
    })
    puzzles.value = data?.myPuzzles?.nodes ?? []
  } finally {
    loading.value = false
  }
}

async function add(id: string) {
  busy.value = id
  await apolloClient.mutate<AddPuzzleToCollectionMutation, AddPuzzleToCollectionMutationVariables>({
    mutation: AddPuzzleToCollectionDocument, variables: { collectionId: props.collectionId, puzzleId: id },
  })
  added.value = new Set(added.value).add(id)
  busy.value = null
  emit('added')
}

watch(folderId, loadPuzzles)
onMounted(() => {
  loadFolders()
  loadPuzzles()
})
</script>

<template>
  <BaseModal
    variant="sheet"
    size="2xl"
    card-class="p-6 gap-4"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between shrink-0">
      <h2 class="font-display text-base font-semibold text-ink-text">
        Add puzzles
      </h2>
      <button
        class="text-sm text-soft hover:text-ink-text"
        @click="emit('close')"
      >
        Done
      </button>
    </div>

    <!-- Mobile-only trigger; the folder list opens in a sheet so a long folder
         tree never pushes the puzzle list out of frame. -->
    <MobileFilterButton
      class="self-start"
      label="Folders"
      :icon="mdiFolderOutline"
      :count="folderId !== 'all' ? 1 : 0"
      @open="foldersOpen = true"
    />

    <div class="flex gap-4 min-h-0 flex-1">
      <FilterPanel
        :open="foldersOpen"
        title="Folders"
        aside-class="w-48"
        @close="foldersOpen = false"
      >
        <FolderFilterList
          :tree="tree"
          :selected-id="folderId"
          count-key="puzzleCount"
          @select="folderId = $event; foldersOpen = false"
        />
      </FilterPanel>

      <div class="flex-1 min-w-0 overflow-y-auto">
        <p
          v-if="loading"
          class="text-sm text-faint"
        >
          Loading…
        </p>
        <p
          v-else-if="!available.length"
          class="text-sm text-faint"
        >
          No puzzles to add here.
        </p>
        <ul
          v-else
          class="flex flex-col gap-1"
        >
          <li
            v-for="puzzle in available"
            :key="puzzle.id"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-line"
          >
            <span class="flex-1 truncate text-sm text-ink-text">{{ puzzle.title }}</span>
            <button
              class="text-sm text-action hover:underline disabled:opacity-50"
              :disabled="busy === puzzle.id"
              @click="add(puzzle.id)"
            >
              Add
            </button>
          </li>
        </ul>
      </div>
    </div>
  </BaseModal>
</template>
