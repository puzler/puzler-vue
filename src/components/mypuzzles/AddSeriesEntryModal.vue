<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import MyPuzzlesDocument from '@/graphql/gql/puzzles/queries/MyPuzzles.graphql'
import MyCollectionsDocument from '@/graphql/gql/collections/queries/MyCollections.graphql'
import AddSeriesEntryDocument from '@/graphql/gql/series/mutations/AddSeriesEntry.graphql'
import type {
  MyPuzzlesQuery, MyPuzzlesQueryVariables,
  MyCollectionsQuery, MyCollectionsQueryVariables,
  AddSeriesEntryMutation, AddSeriesEntryMutationVariables,
} from '@/graphql/generated/types'

const props = defineProps<{ seriesId: string; excludePuzzleIds: string[]; excludeCollectionIds: string[] }>()
const emit = defineEmits<{ added: []; close: [] }>()

const tab = ref<'puzzles' | 'collections'>('puzzles')
const puzzles = ref<MyPuzzlesQuery['myPuzzles']['nodes']>([])
const collections = ref<MyCollectionsQuery['myCollections']['nodes']>([])
const added = ref(new Set<string>())
const busy = ref<string | null>(null)

const availablePuzzles = computed(() =>
  puzzles.value.filter((p) => !props.excludePuzzleIds.includes(p.id) && !added.value.has(`Puzzle:${p.id}`)),
)
const availableCollections = computed(() =>
  collections.value.filter((c) => !props.excludeCollectionIds.includes(c.id) && !added.value.has(`Collection:${c.id}`)),
)

async function load() {
  // Pickers show the whole library; request a large page so the paginated
  // queries return everything (search-driven pickers would be the next step).
  const [p, c] = await Promise.all([
    apolloClient.query<MyPuzzlesQuery, MyPuzzlesQueryVariables>({ query: MyPuzzlesDocument, variables: { filter: { perPage: 200 } }, fetchPolicy: 'network-only' }),
    apolloClient.query<MyCollectionsQuery, MyCollectionsQueryVariables>({ query: MyCollectionsDocument, variables: { filter: { perPage: 200 } }, fetchPolicy: 'network-only' }),
  ])
  puzzles.value = p.data?.myPuzzles?.nodes ?? []
  collections.value = c.data?.myCollections?.nodes ?? []
}

async function add(entryableType: 'Puzzle' | 'Collection', entryableId: string) {
  busy.value = `${entryableType}:${entryableId}`
  await apolloClient.mutate<AddSeriesEntryMutation, AddSeriesEntryMutationVariables>({
    mutation: AddSeriesEntryDocument, variables: { seriesId: props.seriesId, entryableType, entryableId },
  })
  added.value = new Set(added.value).add(`${entryableType}:${entryableId}`)
  busy.value = null
  emit('added')
}

const TAB = 'px-3 py-1 text-sm rounded-lg'
onMounted(load)
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 max-h-[80vh]">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-base font-semibold text-ink-text">
            Add entry
          </h2>
          <button
            class="text-sm text-soft hover:text-ink-text"
            @click="emit('close')"
          >
            Done
          </button>
        </div>

        <div class="flex gap-2">
          <button
            :class="[TAB, tab === 'puzzles' ? 'bg-action text-white' : 'text-soft hover:text-ink-text']"
            @click="tab = 'puzzles'"
          >
            Puzzles
          </button>
          <button
            :class="[TAB, tab === 'collections' ? 'bg-action text-white' : 'text-soft hover:text-ink-text']"
            @click="tab = 'collections'"
          >
            Collections
          </button>
        </div>

        <ul class="flex flex-col gap-1 overflow-y-auto">
          <li
            v-for="item in (tab === 'puzzles' ? availablePuzzles : availableCollections)"
            :key="item.id"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-line"
          >
            <span class="flex-1 truncate text-sm text-ink-text">{{ item.title }}</span>
            <button
              class="text-sm text-action hover:underline disabled:opacity-50"
              :disabled="busy === `${tab === 'puzzles' ? 'Puzzle' : 'Collection'}:${item.id}`"
              @click="add(tab === 'puzzles' ? 'Puzzle' : 'Collection', item.id)"
            >
              Add
            </button>
          </li>
        </ul>
        <p
          v-if="!(tab === 'puzzles' ? availablePuzzles.length : availableCollections.length)"
          class="text-sm text-faint"
        >
          Nothing left to add here.
        </p>
      </div>
    </div>
  </Teleport>
</template>
