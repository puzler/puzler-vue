<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import MyCollectionsDocument from '@/graphql/gql/collections/queries/MyCollections.graphql'
import CreateCollectionDocument from '@/graphql/gql/collections/mutations/CreateCollection.graphql'
import type {
  MyCollectionsQuery, MyCollectionsQueryVariables,
  CreateCollectionMutation, CreateCollectionMutationVariables,
} from '@/graphql/generated/types'
import { CollectionModeEnum, CollectionVisibilityEnum } from '@/graphql/generated/types'

const collections = ref<MyCollectionsQuery['myCollections']>([])
const loading = ref(true)
const router = useRouter()

const VISIBILITY_LABEL: Record<string, string> = {
  [CollectionVisibilityEnum.Private]: 'Private',
  [CollectionVisibilityEnum.Unlisted]: 'Unlisted',
  [CollectionVisibilityEnum.ContainersOnly]: 'In series',
  [CollectionVisibilityEnum.Public]: 'Public',
  [CollectionVisibilityEnum.PatronsOnly]: 'Patrons',
  [CollectionVisibilityEnum.SubscribersOnly]: 'Subscribers',
}

async function load() {
  const { data } = await apolloClient.query<MyCollectionsQuery, MyCollectionsQueryVariables>({ query: MyCollectionsDocument, fetchPolicy: 'network-only' })
  collections.value = data?.myCollections ?? []
  loading.value = false
}

async function createCollection() {
  const title = window.prompt('New collection title')?.trim()
  if (!title) return
  const { data } = await apolloClient.mutate<CreateCollectionMutation, CreateCollectionMutationVariables>({ mutation: CreateCollectionDocument, variables: { title } })
  const created = data?.createCollection?.collection
  if (created) router.push({ name: 'collection-detail', params: { id: created.id } })
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex justify-end mb-4">
      <button
        class="px-3 py-1.5 text-sm rounded-lg bg-action text-white hover:bg-action-deep"
        @click="createCollection"
      >
        New collection
      </button>
    </div>

    <p
      v-if="loading"
      class="text-soft"
    >
      Loading…
    </p>
    <p
      v-else-if="!collections.length"
      class="text-soft"
    >
      No collections yet. Group puzzles into a collection to present them as a set.
    </p>
    <ul
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <li
        v-for="collection in collections"
        :key="collection.id"
      >
        <RouterLink
          :to="{ name: 'collection-detail', params: { id: collection.id } }"
          class="block p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-medium text-ink-text truncate">{{ collection.title }}</span>
            <span class="text-xs text-faint shrink-0">{{ collection.puzzleCount }} puzzle{{ collection.puzzleCount === 1 ? '' : 's' }}</span>
          </div>
          <span class="text-xs text-soft">
            {{ VISIBILITY_LABEL[collection.visibility] }} · {{ collection.mode === CollectionModeEnum.Sequence ? 'In sequence' : 'Any order' }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
