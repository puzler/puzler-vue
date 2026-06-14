<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useAuthStore } from '@/stores/auth'
import { apolloClient } from '@/utils/apolloClient'
import { deserializePuzzle, boardSnapshot, type SerializedPuzzle } from '@/utils/puzzleExport'
import { hashSolution } from '@/utils/solutionHash'
import { markSolved } from '@/utils/solveProgress'
import { useGridKeyboard } from '@/composables/useGridKeyboard'
import PuzzleForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleForPlay.graphql'
import PuzzleByTokenForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleByTokenForPlay.graphql'
import RevealSolveMessageDocument from '@/graphql/gql/puzzles/mutations/RevealSolveMessage.graphql'
import CollectionPublicDocument from '@/graphql/gql/collections/queries/CollectionPublic.graphql'
import CollectionByTokenPublicDocument from '@/graphql/gql/collections/queries/CollectionByTokenPublic.graphql'
import RecordCollectionSolveTimeDocument from '@/graphql/gql/collections/mutations/RecordCollectionSolveTime.graphql'
import type {
  PuzzleForPlayQuery,
  PuzzleForPlayQueryVariables,
  PuzzleByTokenForPlayQuery,
  PuzzleByTokenForPlayQueryVariables,
  RevealSolveMessageMutation,
  RevealSolveMessageMutationVariables,
  CollectionPublicQuery,
  CollectionPublicQueryVariables,
  CollectionByTokenPublicQuery,
  CollectionByTokenPublicQueryVariables,
  RecordCollectionSolveTimeMutation,
  RecordCollectionSolveTimeMutationVariables,
} from '@/graphql/generated/types'

const route = useRoute()
const router = useRouter()
const editor = useEditorStore()
const grid = useGridStore()
const auth = useAuthStore()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const title = ref('')
const author = ref<{ username: string; displayName: string } | null>(null)
const authorCredit = ref<string | null>(null)
const puzzleId = ref<string | null>(null)
const solutionHash = ref<string | null>(null)
const solved = ref(false)
const solveMessage = ref<string | null>(null)

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))

// Optional collection context: when playing inside a collection, we offer
// "next puzzle" navigation. `ct` carries the collection's share token (unlisted).
const collectionId = computed(() => (typeof route.query.collection === 'string' ? route.query.collection : null))
const collectionToken = computed(() => (typeof route.query.ct === 'string' ? route.query.ct : null))
const collectionTitle = ref('')
const collectionTimed = ref(false)
// Puzzles in collection order, each with its own share token (present for
// container-only puzzles) so next-puzzle navigation can build a working link.
const orderedPuzzles = ref<{ id: string; token: string | null }[]>([])

// Competition timer (only runs inside a timed collection).
const elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const elapsedLabel = computed(() => {
  const m = Math.floor(elapsed.value / 60)
  const s = elapsed.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}
function startTimer() {
  stopTimer()
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value += 1 }, 1000)
}
const nextEntry = computed(() => {
  if (!puzzleId.value) return null
  const idx = orderedPuzzles.value.findIndex((p) => p.id === puzzleId.value)
  return idx >= 0 && idx < orderedPuzzles.value.length - 1 ? orderedPuzzles.value[idx + 1] : null
})
const nextId = computed(() => nextEntry.value?.id ?? null)

async function loadCollectionOrder() {
  if (!collectionId.value) return
  if (collectionToken.value) {
    const { data } = await apolloClient.query<CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables>({
      query: CollectionByTokenPublicDocument, variables: { token: collectionToken.value }, fetchPolicy: 'network-only',
    })
    collectionTitle.value = data?.collectionByToken?.title ?? ''
    collectionTimed.value = data?.collectionByToken?.timed ?? false
    orderedPuzzles.value = data?.collectionByToken?.puzzles.map((p) => ({ id: p.id, token: p.shareToken ?? null })) ?? []
  } else {
    const { data } = await apolloClient.query<CollectionPublicQuery, CollectionPublicQueryVariables>({
      query: CollectionPublicDocument, variables: { id: collectionId.value }, fetchPolicy: 'network-only',
    })
    collectionTitle.value = data?.collection?.title ?? ''
    collectionTimed.value = data?.collection?.timed ?? false
    orderedPuzzles.value = data?.collection?.puzzles.map((p) => ({ id: p.id, token: p.shareToken ?? null })) ?? []
  }
}

function goToNext() {
  const next = nextEntry.value
  if (!next) return
  // Keep the collection context but swap in the next puzzle's own token (or drop
  // it) so a container-only next puzzle still resolves.
  const query: Record<string, string> = {}
  if (typeof route.query.collection === 'string') query.collection = route.query.collection
  if (typeof route.query.ct === 'string') query.ct = route.query.ct
  if (next.token) query.t = next.token
  router.push({ name: 'player', params: { id: next.id }, query })
}

function backToCollection() {
  if (!collectionId.value) return
  router.push({ name: 'collection', params: { id: collectionId.value }, query: collectionToken.value ? { t: collectionToken.value } : {} })
}

// Re-check after every change: hash the filled cells and compare to the
// published hash. Exact match means solved — which naturally supports variants
// whose solution leaves some cells blank (the solution simply omits them).
watch(
  () => [editor.givenDigits, editor.solverCellStates],
  () => {
    if (solved.value || !solutionHash.value) return
    if (hashSolution(boardSnapshot(editor, grid)) === solutionHash.value) onSolved()
  },
  { deep: true },
)

// On a correct solve, ask the server for the author's custom message (it's
// never sent in the puzzle data). Falls back to the default if there is none.
async function onSolved() {
  solved.value = true
  stopTimer()
  if (puzzleId.value) markSolved(puzzleId.value)
  // Record the time for the leaderboard (logged-in solvers, timed collections).
  if (collectionTimed.value && collectionId.value && puzzleId.value && auth.isAuthenticated && elapsed.value > 0) {
    apolloClient.mutate<RecordCollectionSolveTimeMutation, RecordCollectionSolveTimeMutationVariables>({
      mutation: RecordCollectionSolveTimeDocument,
      variables: { collectionId: collectionId.value, puzzleId: puzzleId.value, seconds: elapsed.value },
    }).catch(() => { /* best-effort */ })
  }
  if (!puzzleId.value || !solutionHash.value) return
  try {
    const { data } = await apolloClient.mutate<RevealSolveMessageMutation, RevealSolveMessageMutationVariables>({
      mutation: RevealSolveMessageDocument,
      variables: { puzzleId: puzzleId.value, solutionHash: solutionHash.value, shareToken: shareToken.value },
    })
    solveMessage.value = data?.revealSolveMessage?.solveMessage ?? null
  } catch {
    // Keep the default message if the reveal call fails.
  }
}

async function fetchById(id: string) {
  const { data } = await apolloClient.query<PuzzleForPlayQuery, PuzzleForPlayQueryVariables>({
    query: PuzzleForPlayDocument,
    variables: { id },
    fetchPolicy: 'network-only',
  })
  return data?.puzzle ?? null
}

async function fetchByToken(token: string) {
  const { data } = await apolloClient.query<PuzzleByTokenForPlayQuery, PuzzleByTokenForPlayQueryVariables>({
    query: PuzzleByTokenForPlayDocument,
    variables: { token },
    fetchPolicy: 'network-only',
  })
  return data?.puzzleByToken ?? null
}

async function loadPuzzle() {
  loading.value = true
  errorMessage.value = null
  solved.value = false
  solveMessage.value = null
  stopTimer()
  editor.reset()
  const id = typeof route.params.id === 'string' ? route.params.id : null
  try {
    const puzzle = shareToken.value ? await fetchByToken(shareToken.value) : id ? await fetchById(id) : null
    if (!puzzle) {
      errorMessage.value = 'This puzzle isn’t available.'
      return
    }
    if (!puzzle.publishedVersion) {
      errorMessage.value = 'This puzzle hasn’t been published yet.'
      return
    }
    title.value = puzzle.title
    author.value = puzzle.author
    authorCredit.value = puzzle.authorName ?? null
    puzzleId.value = puzzle.id
    solutionHash.value = puzzle.publishedVersion.solutionHash ?? null
    deserializePuzzle(editor, grid, puzzle.publishedVersion.definition as SerializedPuzzle)
    editor.setMode('solving')
    if (collectionTimed.value) startTimer()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Could not load this puzzle.'
  } finally {
    loading.value = false
  }
}

// Grid keyboard interaction is shared with the editor so the two stay in
// lockstep (the editor-only branches are inert here). It self-registers its
// own window listeners.
useGridKeyboard()


// Re-load when navigating between puzzles in a collection (same route).
watch(() => route.params.id, loadPuzzle)

onMounted(async () => {
  await loadCollectionOrder() // sets collectionTimed before the timer can start
  loadPuzzle()
})
onUnmounted(() => {
  stopTimer()
  // Leave a clean slate so the editor store isn't holding a played puzzle.
  editor.reset()
})
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="px-4 py-2 border-b border-line bg-paper shrink-0 flex items-baseline gap-2">
      <h1 class="text-sm font-semibold text-ink-text">
        {{ title || 'Puzzle' }}
      </h1>
      <span
        v-if="author"
        class="text-xs text-faint"
      >by <AuthorAttribution
        :author="author"
        :author-name="authorCredit"
      /></span>
      <span
        v-if="collectionTimed"
        class="ml-auto text-sm font-mono tabular-nums text-ink-text"
        :title="'Elapsed time'"
      >⏱ {{ elapsedLabel }}</span>
    </header>

    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center text-soft"
    >
      Loading…
    </div>
    <div
      v-else-if="errorMessage"
      class="flex-1 flex items-center justify-center text-soft"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else
      class="flex-1 flex overflow-hidden min-h-0"
    >
      <main class="flex-1 bg-canvas overflow-hidden min-h-0">
        <SudokuGrid
          mode="edit"
          :given-digits="editor.givenDigits"
          :cell-states="editor.solverCellStates"
          :selection="editor.selection"
          @update:selection="editor.selection = $event"
          @clear-selection="editor.clearSelection()"
        />
      </main>
      <div class="shrink-0 w-52 border-l border-line">
        <SolverNumpad class="w-52 h-full" />
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="solved"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        @click.self="solved = false"
      >
        <div class="bg-surface rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3 w-80">
          <span class="text-2xl">🎉</span>
          <span class="text-lg font-semibold text-ink-text">Solved!</span>
          <span
            class="text-sm text-center whitespace-pre-line"
            :class="solveMessage ? 'text-ink-text' : 'text-faint'"
          >{{ solveMessage || `Nicely done — you completed “${title}”.` }}</span>
          <button
            v-if="collectionId && nextId"
            class="mt-2 px-4 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep"
            @click="goToNext"
          >
            Next puzzle →
          </button>
          <button
            v-else-if="collectionId"
            class="mt-2 px-4 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep"
            @click="backToCollection"
          >
            Back to {{ collectionTitle || 'collection' }}
          </button>
          <button
            class="text-sm text-soft hover:text-ink-text"
            @click="solved = false"
          >
            Keep looking
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
