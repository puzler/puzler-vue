<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { mdiFolderOutline } from '@mdi/js'
import { apolloClient } from '@/utils/apolloClient'
import FolderSidebar from './FolderSidebar.vue'
import FolderSelect from './FolderSelect.vue'
import ListToolbar from '@/components/listing/ListToolbar.vue'
import ListPagination from '@/components/listing/ListPagination.vue'
import MobileFilterButton from '@/components/listing/MobileFilterButton.vue'
import FilterPanel from '@/components/ui/FilterPanel.vue'
import RowMeta from './RowMeta.vue'
import { useFilterableList } from '@/composables/useFilterableList'
import type { FolderNode } from './folderTree'
import { COLLECTION_VISIBILITY_OPTIONS } from '@/constants/visibility'
import MyCollectionsDocument from '@/graphql/gql/collections/queries/MyCollections.graphql'
import MyFolderTreeDocument from '@/graphql/gql/collections/queries/MyFolderTree.graphql'
import MyFoldersDocument from '@/graphql/gql/collections/queries/MyFolders.graphql'
import UpdateCollectionDocument from '@/graphql/gql/collections/mutations/UpdateCollection.graphql'
import MoveCollectionToFolderDocument from '@/graphql/gql/collections/mutations/MoveCollectionToFolder.graphql'
import type {
  MyCollectionsQuery, MyFolderTreeQuery, MyFolderTreeQueryVariables, MyFoldersQuery, MyFoldersQueryVariables,
  UpdateCollectionMutation, UpdateCollectionMutationVariables,
  MoveCollectionToFolderMutation, MoveCollectionToFolderMutationVariables,
} from '@/graphql/generated/types'
import { CollectionModeEnum, CollectionVisibilityEnum } from '@/graphql/generated/types'

type MyCollection = MyCollectionsQuery['myCollections']['nodes'][number]

const list = useFilterableList<MyCollectionsQuery, MyCollection>({
  query: MyCollectionsDocument,
  select: (d) => d.myCollections,
  supportsFolders: true,
})

const tree = ref<FolderNode[]>([])
const flatFolders = ref<MyFoldersQuery['myFolders']>([])
const foldersOpen = ref(false)
const folderActive = computed(() => (list.folderId.value !== 'all' ? 1 : 0))

async function loadFolders() {
  const [t, f] = await Promise.all([
    apolloClient.query<MyFolderTreeQuery, MyFolderTreeQueryVariables>({ query: MyFolderTreeDocument, fetchPolicy: 'network-only' }),
    apolloClient.query<MyFoldersQuery, MyFoldersQueryVariables>({ query: MyFoldersDocument, fetchPolicy: 'network-only' }),
  ])
  tree.value = (t.data?.myFolderTree ?? []) as unknown as FolderNode[]
  flatFolders.value = f.data?.myFolders ?? []
}

function subtext(c: MyCollection) {
  const bits = [c.mode === CollectionModeEnum.Sequence ? 'In sequence' : 'Any order']
  if (c.avgRating) bits.push(`★ ${c.avgRating.toFixed(1)}`)
  if (c.solveCount) bits.push(`${c.solveCount} solve${c.solveCount === 1 ? '' : 's'}`)
  return bits.join(' · ')
}

async function changeVisibility(collection: MyCollection, visibility: string) {
  await apolloClient.mutate<UpdateCollectionMutation, UpdateCollectionMutationVariables>({
    mutation: UpdateCollectionDocument, variables: { id: collection.id, visibility: visibility as CollectionVisibilityEnum },
  })
  await list.reload()
}

async function moveToFolder(collection: MyCollection, folderId: string | null) {
  await apolloClient.mutate<MoveCollectionToFolderMutation, MoveCollectionToFolderMutationVariables>({
    mutation: MoveCollectionToFolderDocument, variables: { collectionId: collection.id, folderId },
  })
  await Promise.all([list.reload(), loadFolders()])
}

onMounted(loadFolders)
</script>

<template>
  <div class="flex gap-6">
    <FilterPanel
      :open="foldersOpen"
      title="Folders"
      @close="foldersOpen = false"
    >
      <FolderSidebar
        :tree="tree"
        :selected-id="list.folderId.value"
        noun="collections"
        count-key="collectionCount"
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
        :visibility-options="COLLECTION_VISIBILITY_OPTIONS"
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
        No collections match. Group puzzles into a collection to present them as a set.
      </p>
      <ul
        v-else
        class="flex flex-col gap-2"
      >
        <li
          v-for="collection in list.nodes.value"
          :key="collection.id"
          class="flex items-center gap-3 p-3 rounded-xl border border-line"
        >
          <RouterLink
            :to="{ name: 'collection-detail', params: { id: collection.id } }"
            class="flex flex-col min-w-0 flex-1 hover:text-action"
          >
            <span class="font-medium text-ink-text truncate">{{ collection.title }}</span>
            <span class="text-xs text-faint">{{ collection.puzzleCount }} puzzle{{ collection.puzzleCount === 1 ? '' : 's' }} · {{ subtext(collection) }}</span>
          </RouterLink>
          <RowMeta
            kind="collection"
            :entity-id="collection.id"
            :visibility="collection.visibility"
            :share-token="collection.shareToken"
            :visibility-options="COLLECTION_VISIBILITY_OPTIONS"
            @update-visibility="changeVisibility(collection, $event)"
          />
          <FolderSelect
            :folders="flatFolders"
            :value="collection.folder?.id"
            @change="moveToFolder(collection, $event)"
          />
        </li>
      </ul>

      <ListPagination
        :page="list.page.value"
        :total-pages="list.totalPages.value"
        :total-count="list.totalCount.value"
        @change="list.setPage"
      />
    </div>
  </div>
</template>
