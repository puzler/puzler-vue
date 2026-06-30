<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ContentPage from '@/components/ContentPage.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import AddPuzzlesModal from '@/components/mypuzzles/AddPuzzlesModal.vue'
import CollectionPuzzleList from '@/components/mypuzzles/CollectionPuzzleList.vue'
import CollectionSettings from '@/components/mypuzzles/CollectionSettings.vue'
import CollectionDetailDocument from '@/graphql/gql/collections/queries/CollectionDetail.graphql'
import UpdateCollectionDocument from '@/graphql/gql/collections/mutations/UpdateCollection.graphql'
import DeleteCollectionDocument from '@/graphql/gql/collections/mutations/DeleteCollection.graphql'
import RemovePuzzleFromCollectionDocument from '@/graphql/gql/collections/mutations/RemovePuzzleFromCollection.graphql'
import ReorderCollectionPuzzlesDocument from '@/graphql/gql/collections/mutations/ReorderCollectionPuzzles.graphql'
import type {
  CollectionDetailQuery, CollectionDetailQueryVariables,
  UpdateCollectionMutation, UpdateCollectionMutationVariables,
  DeleteCollectionMutation, DeleteCollectionMutationVariables,
  RemovePuzzleFromCollectionMutation, RemovePuzzleFromCollectionMutationVariables,
  ReorderCollectionPuzzlesMutation, ReorderCollectionPuzzlesMutationVariables,
} from '@/graphql/generated/types'
import { CollectionVisibilityEnum } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionDetailQuery['collection']>
type Attrs = Partial<Pick<UpdateCollectionMutationVariables, 'title' | 'visibility' | 'mode' | 'timed'>>

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const collection = ref<Collection | null>(null)
const puzzles = ref<Collection['puzzles']>([])
const loading = ref(true)
const showAdd = ref(false)
const showDelete = ref(false)

async function load() {
  const { data } = await apolloClient.query<CollectionDetailQuery, CollectionDetailQueryVariables>({
    query: CollectionDetailDocument, variables: { id }, fetchPolicy: 'network-only',
  })
  collection.value = data?.collection ?? null
  puzzles.value = collection.value ? [ ...collection.value.puzzles ] : []
  loading.value = false
}

function save(attrs: Attrs) {
  apolloClient.mutate<UpdateCollectionMutation, UpdateCollectionMutationVariables>({
    mutation: UpdateCollectionDocument, variables: { id, ...attrs },
  })
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= puzzles.value.length) return
  const next = [ ...puzzles.value ]
  ;[ next[index], next[target] ] = [ next[target], next[index] ]
  puzzles.value = next
  apolloClient.mutate<ReorderCollectionPuzzlesMutation, ReorderCollectionPuzzlesMutationVariables>({
    mutation: ReorderCollectionPuzzlesDocument, variables: { collectionId: id, orderedPuzzleIds: next.map((p) => p.id) },
  })
}

async function removePuzzle(puzzleId: string) {
  await apolloClient.mutate<RemovePuzzleFromCollectionMutation, RemovePuzzleFromCollectionMutationVariables>({
    mutation: RemovePuzzleFromCollectionDocument, variables: { collectionId: id, puzzleId },
  })
  puzzles.value = puzzles.value.filter((p) => p.id !== puzzleId)
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

        <CollectionPuzzleList
          :puzzles="puzzles"
          @move="move"
          @remove="removePuzzle"
          @add="showAdd = true"
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

      <AddPuzzlesModal
        v-if="showAdd && collection"
        :collection-id="id"
        :exclude-ids="puzzles.map((p) => p.id)"
        @added="load"
        @close="showAdd = false"
      />
      <ConfirmModal
        v-if="showDelete"
        message="Delete this collection? The puzzles themselves are kept."
        confirm-label="Delete"
        @confirm="deleteCollection"
        @cancel="showDelete = false"
      />
    </div>
  </ContentPage>
</template>
