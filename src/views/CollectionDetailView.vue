<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ContentPage from '@/components/ContentPage.vue'
import CollectionEntryList from '@/components/mypuzzles/CollectionEntryList.vue'
import CollectionSettings from '@/components/mypuzzles/CollectionSettings.vue'
import CollectionPageEditor from '@/components/mypuzzles/CollectionPageEditor.vue'
import CollectionDetailModals from '@/components/mypuzzles/CollectionDetailModals.vue'
import CollectionDetailDocument from '@/graphql/gql/collections/queries/CollectionDetail.graphql'
import UpdateCollectionDocument from '@/graphql/gql/collections/mutations/UpdateCollection.graphql'
import DeleteCollectionDocument from '@/graphql/gql/collections/mutations/DeleteCollection.graphql'
import AddStoryPageToCollectionDocument from '@/graphql/gql/collections/mutations/AddStoryPageToCollection.graphql'
import RemoveCollectionEntryDocument from '@/graphql/gql/collections/mutations/RemoveCollectionEntry.graphql'
import ReorderCollectionEntriesDocument from '@/graphql/gql/collections/mutations/ReorderCollectionEntries.graphql'
import type {
  CollectionDetailQuery, CollectionDetailQueryVariables,
  UpdateCollectionMutation, UpdateCollectionMutationVariables,
  DeleteCollectionMutation, DeleteCollectionMutationVariables,
  AddStoryPageToCollectionMutation, AddStoryPageToCollectionMutationVariables,
  RemoveCollectionEntryMutation, RemoveCollectionEntryMutationVariables,
  ReorderCollectionEntriesMutation, ReorderCollectionEntriesMutationVariables,
} from '@/graphql/generated/types'
import { CollectionVisibilityEnum } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionDetailQuery['collection']>
type Entry = Collection['entries'][number]
type Attrs = Partial<Pick<UpdateCollectionMutationVariables,
  'title' | 'visibility' | 'mode' | 'timed' | 'accentColor' | 'bgTreatment' | 'titleFont'>>

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const collection = ref<Collection | null>(null)
const entries = ref<Entry[]>([])
const loading = ref(true)
const showAdd = ref(false)
const showDelete = ref(false)
const editingStory = ref<Entry['storyPage'] | null>(null)
const editingGates = ref<Entry | null>(null)
const removingEntry = ref<Entry | null>(null)

function entryLabel(entry: Entry): string {
  return entry.entryType === 'Puzzle'
    ? (entry.puzzle?.title ?? 'Puzzle')
    : (entry.storyPage?.title || 'Untitled story page')
}

const puzzleIds = computed(() =>
  entries.value.flatMap((entry) => (entry.puzzle ? [ entry.puzzle.id ] : [])))

async function load() {
  const { data } = await apolloClient.query<CollectionDetailQuery, CollectionDetailQueryVariables>({
    query: CollectionDetailDocument, variables: { id }, fetchPolicy: 'network-only',
  })
  collection.value = data?.collection ?? null
  entries.value = collection.value ? [ ...collection.value.entries ] : []
  loading.value = false
}

function save(attrs: Attrs) {
  apolloClient.mutate<UpdateCollectionMutation, UpdateCollectionMutationVariables>({
    mutation: UpdateCollectionDocument, variables: { id, ...attrs },
  })
  // Reflect the change locally so dependent UI (page editor preview) updates.
  if (collection.value) {
    const defined = Object.fromEntries(
      Object.entries(attrs).filter(([ , value ]) => value !== undefined && value !== null),
    ) as Partial<Collection>
    collection.value = { ...collection.value, ...defined }
  }
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= entries.value.length) return
  const next = [ ...entries.value ]
  ;[ next[index], next[target] ] = [ next[target], next[index] ]
  entries.value = next
  apolloClient.mutate<ReorderCollectionEntriesMutation, ReorderCollectionEntriesMutationVariables>({
    mutation: ReorderCollectionEntriesDocument, variables: { collectionId: id, orderedEntryIds: next.map((e) => e.id) },
  })
}

// Puzzle entries unlink immediately; story pages are destroyed with their
// entry, so those go through a confirm first.
function requestRemove(entry: Entry) {
  if (entry.entryType === 'StoryPage') removingEntry.value = entry
  else void removeEntry(entry)
}

async function removeEntry(entry: Entry) {
  removingEntry.value = null
  await apolloClient.mutate<RemoveCollectionEntryMutation, RemoveCollectionEntryMutationVariables>({
    mutation: RemoveCollectionEntryDocument, variables: { collectionId: id, entryId: entry.id },
  })
  entries.value = entries.value.filter((e) => e.id !== entry.id)
}

async function addStoryPage() {
  const { data } = await apolloClient.mutate<AddStoryPageToCollectionMutation, AddStoryPageToCollectionMutationVariables>({
    mutation: AddStoryPageToCollectionDocument, variables: { collectionId: id },
  })
  const storyPage = data?.addStoryPageToCollection?.storyPage
  await load()
  if (storyPage) editingStory.value = storyPage
}

async function closeStoryModal() {
  editingStory.value = null
  await load()
}

async function deleteCollection() {
  await apolloClient.mutate<DeleteCollectionMutation, DeleteCollectionMutationVariables>({ mutation: DeleteCollectionDocument, variables: { id } })
  router.push({ name: 'my-puzzles' })
}

// Public page link; unlisted collections carry their share token in the URL.
const publicRoute = computed(() => ({
  name: 'collection',
  params: { id },
  query: collection.value && collection.value.shareToken &&
    (collection.value.visibility === CollectionVisibilityEnum.Unlisted || collection.value.visibility === CollectionVisibilityEnum.ContainersOnly)
    ? { t: collection.value.shareToken } : {},
}))

onMounted(load)
</script>

<template>
  <ContentPage>
    <div class="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <RouterLink
        :to="{ name: 'my-puzzles' }"
        class="text-sm text-soft hover:text-action"
      >
        ← My Puzzles
      </RouterLink>

      <p
        v-if="loading"
        class="text-soft mt-4"
      >
        Loading…
      </p>
      <p
        v-else-if="!collection"
        class="text-soft mt-4"
      >
        Collection not found.
      </p>
      <div
        v-else
        class="mt-4 flex flex-col gap-6"
      >
        <CollectionSettings
          :title="collection.title"
          :visibility="collection.visibility"
          :mode="collection.mode"
          :timed="collection.timed"
          @save="save"
        />

        <RouterLink
          v-if="collection.visibility !== CollectionVisibilityEnum.Private"
          :to="publicRoute"
          class="text-sm text-action hover:underline"
        >
          View public page →
        </RouterLink>

        <CollectionPageEditor
          :collection-id="id"
          :cover-image-url="collection.coverImageUrl ?? null"
          :page-description-html="collection.pageDescriptionHtml ?? null"
          :accent-color="collection.accentColor"
          :bg-treatment="collection.bgTreatment"
          :title-font="collection.titleFont"
          @save="save"
        />

        <CollectionEntryList
          :entries="entries"
          @move="move"
          @remove="requestRemove"
          @add="showAdd = true"
          @add-story="addStoryPage"
          @edit-story="editingStory = $event.storyPage"
          @edit-gates="editingGates = $event"
        />

        <div class="pt-4 border-t border-line">
          <button
            class="text-sm text-red-600 hover:underline"
            @click="showDelete = true"
          >
            Delete collection
          </button>
        </div>
      </div>

      <CollectionDetailModals
        :collection-id="id"
        :show-add="showAdd && !!collection"
        :exclude-ids="puzzleIds"
        :editing-story="editingStory"
        :editing-gates="editingGates"
        :gates-label="editingGates ? entryLabel(editingGates) : ''"
        :removing-entry="removingEntry"
        :show-delete="showDelete"
        @added="load"
        @close-add="showAdd = false"
        @close-story="closeStoryModal"
        @saved-gates="load"
        @close-gates="editingGates = null"
        @confirm-remove="removingEntry && removeEntry(removingEntry)"
        @cancel-remove="removingEntry = null"
        @confirm-delete="deleteCollection"
        @cancel-delete="showDelete = false"
      />
    </div>
  </ContentPage>
</template>
