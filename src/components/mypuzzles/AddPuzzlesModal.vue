<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import MyPuzzlesDocument from '@/graphql/gql/puzzles/queries/MyPuzzles.graphql'
import AddPuzzleToCollectionDocument from '@/graphql/gql/collections/mutations/AddPuzzleToCollection.graphql'
import type {
  MyPuzzlesQuery, MyPuzzlesQueryVariables,
  AddPuzzleToCollectionMutation, AddPuzzleToCollectionMutationVariables,
} from '@/graphql/generated/types'

const props = defineProps<{ collectionId: string; excludeIds: string[] }>()
const emit = defineEmits<{ added: []; close: [] }>()

const puzzles = ref<MyPuzzlesQuery['myPuzzles']['nodes']>([])
const added = ref(new Set<string>())
const busy = ref<string | null>(null)

const available = computed(() =>
  puzzles.value.filter((p) => !props.excludeIds.includes(p.id) && !added.value.has(p.id)),
)

async function load() {
  // The picker shows the whole library at once; request a large page so the
  // paginated myPuzzles query returns everything (a search-driven picker would
  // be the next step for authors with more than this many puzzles).
  const { data } = await apolloClient.query<MyPuzzlesQuery, MyPuzzlesQueryVariables>({
    query: MyPuzzlesDocument, variables: { filter: { perPage: 200 } }, fetchPolicy: 'network-only',
  })
  puzzles.value = data?.myPuzzles?.nodes ?? []
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
            Add puzzles
          </h2>
          <button
            class="text-sm text-soft hover:text-ink-text"
            @click="emit('close')"
          >
            Done
          </button>
        </div>
        <p
          v-if="!available.length"
          class="text-sm text-faint"
        >
          No more puzzles to add.
        </p>
        <ul
          v-else
          class="flex flex-col gap-1 overflow-y-auto"
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
  </Teleport>
</template>
