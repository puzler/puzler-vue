<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import PlayerMobileLayout from '@/components/player/PlayerMobileLayout.vue'
import PlayerSidePanel from '@/components/player/PlayerSidePanel.vue'
import PausedOverlay from '@/components/player/PausedOverlay.vue'
import ResetConfirmModal from '@/components/player/ResetConfirmModal.vue'
import RulesIntroModal from '@/components/player/RulesIntroModal.vue'
import CheckResultModal from '@/components/player/CheckResultModal.vue'
import PlayerSettingsModal from '@/components/player/PlayerSettingsModal.vue'
import SolvedModal from '@/components/player/SolvedModal.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useAuthStore } from '@/stores/auth'
import { useIsMobile } from '@/composables/useIsMobile'
import { usePuzzleTimer } from '@/composables/usePuzzleTimer'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { apolloClient } from '@/utils/apolloClient'
import { deserializePuzzle, boardSnapshot, type SerializedPuzzle } from '@/utils/puzzleExport'
import { hashSolution } from '@/utils/solutionHash'
import { markSolved } from '@/utils/solveProgress'
import { useGridKeyboard } from '@/composables/useGridKeyboard'
import PuzzleForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleForPlay.graphql'
import PuzzleByTokenForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleByTokenForPlay.graphql'
import RevealSolveMessageDocument from '@/graphql/gql/puzzles/mutations/RevealSolveMessage.graphql'
import CheckSolutionDocument from '@/graphql/gql/puzzles/mutations/CheckSolution.graphql'
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
  CheckSolutionMutation,
  CheckSolutionMutationVariables,
  CheckResultEnum,
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
const player = usePlayerSettingsStore()
const isMobile = useIsMobile()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const title = ref('')
const author = ref<{ username: string; displayName: string } | null>(null)
const authorCredit = ref<string | null>(null)
const puzzleId = ref<string | null>(null)
const myRating = ref<{ stars: number | null; difficultyVote: number | null } | null>(null)
// Bundled for SolvedModal's rating section (logged-in solvers only).
const ratingContext = computed(() => ({
  puzzleId: puzzleId.value,
  canRate: auth.isAuthenticated,
  stars: myRating.value?.stars ?? null,
  difficulty: myRating.value?.difficultyVote ?? null,
}))
const solutionHash = ref<string | null>(null)
const solved = ref(false)
const solveMessage = ref<string | null>(null)
const showReset = ref(false)
const showRulesIntro = ref(false)
const showCheckResult = ref(false)
const checkResult = ref<CheckResultEnum>('INCORRECT')
const showSettings = ref(false)

// Manual "Check Solution": ask the server (which has the solution) for a coarse
// verdict. A complete-and-correct board routes to the normal win flow; anything
// else opens the result modal (which honours the reveal-partial-progress
// setting). Always available, regardless of the auto-check setting.
async function runCheck() {
  if (!puzzleId.value) return
  try {
    const { data } = await apolloClient.mutate<CheckSolutionMutation, CheckSolutionMutationVariables>({
      mutation: CheckSolutionDocument,
      variables: { puzzleId: puzzleId.value, board: boardSnapshot(editor, grid), shareToken: shareToken.value },
    })
    const result = data?.checkSolution?.result
    if (!result) return
    if (result === 'SOLVED') {
      if (!solved.value) onSolved()
      return
    }
    checkResult.value = result
    showCheckResult.value = true
  } catch {
    // Network/permission failure — silently ignore; the user can retry.
  }
}

// Reset clears the player's entries (undoable; givens are untouched) and
// optionally restarts the clock.
function onResetConfirm(resetTimer: boolean) {
  editor.clearSolverState()
  if (resetTimer) timer.reset()
  showReset.value = false
}

// The rules modal holds the timer while it's open (auto-pause), composing with
// any manual pause via a named hold.
function openRules() {
  showRulesIntro.value = true
  timer.hold('rules')
}
function closeRules() {
  showRulesIntro.value = false
  timer.release('rules')
}

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

// Pausable solving timer — runs for every puzzle. Timed collections also feed
// its elapsed value to the leaderboard on solve.
const timer = usePuzzleTimer()
const { label: timerLabel, paused: timerPaused } = timer
const showTimer = computed(() => !player.settings.hideTimer)
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
    if (solved.value || !solutionHash.value || !player.settings.checkOnFinish) return
    if (hashSolution(boardSnapshot(editor, grid)) === solutionHash.value) onSolved()
  },
  { deep: true },
)

// On a correct solve, ask the server for the author's custom message (it's
// never sent in the puzzle data). Falls back to the default if there is none.
async function onSolved() {
  solved.value = true
  timer.stop()
  if (puzzleId.value) markSolved(puzzleId.value)
  // Record the time for the leaderboard (logged-in solvers, timed collections).
  if (collectionTimed.value && collectionId.value && puzzleId.value && auth.isAuthenticated && timer.elapsed.value > 0) {
    apolloClient.mutate<RecordCollectionSolveTimeMutation, RecordCollectionSolveTimeMutationVariables>({
      mutation: RecordCollectionSolveTimeDocument,
      variables: { collectionId: collectionId.value, puzzleId: puzzleId.value, seconds: timer.elapsed.value },
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
  showRulesIntro.value = false
  timer.stop()
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
    myRating.value = puzzle.myRating ?? null
    solutionHash.value = puzzle.publishedVersion.solutionHash ?? null
    deserializePuzzle(editor, grid, puzzle.publishedVersion.definition as SerializedPuzzle)
    editor.setMode('solving')
    timer.start()
    // Greet the solver with the rules on first load (when enabled), pausing the
    // clock until they dismiss it. Skip when the puzzle carries no rules text.
    if (player.settings.showRulesOnStart && editor.puzzleRules) openRules()
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
  timer.stop()
  // Leave a clean slate so the editor store isn't holding a played puzzle.
  editor.reset()
})
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <div
      v-if="loading || errorMessage"
      class="flex-1 flex items-center justify-center text-soft"
    >
      {{ loading ? 'Loading…' : errorMessage }}
    </div>

    <PlayerMobileLayout
      v-else-if="isMobile"
      :title="title"
      :author="author"
      :author-name="authorCredit"
      :show-timer="showTimer"
      :elapsed-label="timerLabel"
      :paused="timerPaused"
      @toggle-pause="timer.toggle()"
      @reset="showReset = true"
      @show-rules="openRules"
      @check="runCheck"
      @settings="showSettings = true"
    />

    <div
      v-else
      class="flex-1 flex overflow-hidden min-h-0"
    >
      <main class="relative flex-1 bg-canvas overflow-hidden min-h-0">
        <SudokuGrid
          mode="edit"
          :given-digits="editor.givenDigits"
          :cell-states="editor.solverCellStates"
          :selection="editor.selection"
          @update:selection="editor.selection = $event"
          @clear-selection="editor.clearSelection()"
        />
        <PausedOverlay
          v-if="timerPaused"
          @resume="timer.toggle()"
        />
      </main>
      <PlayerSidePanel
        :title="title"
        :author="author"
        :author-name="authorCredit"
        :rules="editor.puzzleRules"
        :show-timer="showTimer"
        :elapsed-label="timerLabel"
        :paused="timerPaused"
        @toggle-pause="timer.toggle()"
        @show-rules="openRules"
        @reset="showReset = true"
        @settings="showSettings = true"
        @check="runCheck"
      />
    </div>

    <ResetConfirmModal
      v-if="showReset"
      :show-timer-option="showTimer"
      @confirm="onResetConfirm"
      @cancel="showReset = false"
    />

    <RulesIntroModal
      v-if="showRulesIntro"
      :title="title"
      :author="author"
      :author-name="authorCredit"
      :rules="editor.puzzleRules"
      @close="closeRules"
    />

    <CheckResultModal
      v-if="showCheckResult"
      :result="checkResult"
      :reveal-partial="player.settings.revealPartialProgress"
      @close="showCheckResult = false"
    />

    <PlayerSettingsModal
      v-if="showSettings"
      @close="showSettings = false"
    />

    <SolvedModal
      v-if="solved"
      :title="title"
      :solve-message="solveMessage"
      :in-collection="!!collectionId"
      :has-next="!!nextId"
      :collection-title="collectionTitle"
      :rating="ratingContext"
      @close="solved = false"
      @next="goToNext"
      @back="backToCollection"
    />
  </div>
</template>
