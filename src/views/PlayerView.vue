<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PlayerLayout from '@/components/player/PlayerLayout.vue'
import ResetConfirmModal from '@/components/player/ResetConfirmModal.vue'
import RulesIntroModal from '@/components/player/RulesIntroModal.vue'
import CheckResultModal from '@/components/player/CheckResultModal.vue'
import PlayerSettingsModal from '@/components/player/PlayerSettingsModal.vue'
import SolvedModal from '@/components/player/SolvedModal.vue'
import CollaborationModal from '@/components/player/CollaborationModal.vue'
import KickedBanner from '@/components/player/KickedBanner.vue'
import CompetitionSolveBanner from '@/components/competitions/CompetitionSolveBanner.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useAuthStore } from '@/stores/auth'
import { useIsMobile } from '@/composables/useIsMobile'
import { usePuzzleTimer } from '@/composables/usePuzzleTimer'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { useSolveSessionStore } from '@/stores/solveSession'
import { usePresenceStore } from '@/stores/presence'
import { useCompetitionStore } from '@/stores/competition'
import { apolloClient } from '@/utils/apolloClient'
import { deserializePuzzle, boardSnapshot, type SerializedPuzzle } from '@/utils/puzzleExport'
import { hashSolution } from '@/utils/solutionHash'
import { markSolved } from '@/utils/solveProgress'
import { useGridKeyboard } from '@/composables/useGridKeyboard'
import { cellKey } from '@/composables/useGrid'
import PuzzleForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleForPlay.graphql'
import PuzzleByTokenForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleByTokenForPlay.graphql'
import SubmitSolutionDocument from '@/graphql/gql/puzzles/mutations/SubmitSolution.graphql'
import CheckSolutionDocument from '@/graphql/gql/puzzles/mutations/CheckSolution.graphql'
import CollectionPublicDocument from '@/graphql/gql/collections/queries/CollectionPublic.graphql'
import CollectionByTokenPublicDocument from '@/graphql/gql/collections/queries/CollectionByTokenPublic.graphql'
import RecordCollectionSolveTimeDocument from '@/graphql/gql/collections/mutations/RecordCollectionSolveTime.graphql'
import type {
  PuzzleForPlayQuery,
  PuzzleForPlayQueryVariables,
  PuzzleByTokenForPlayQuery,
  PuzzleByTokenForPlayQueryVariables,
  SubmitSolutionMutation,
  SubmitSolutionMutationVariables,
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
import { CollectionKindEnum } from '@/graphql/generated/types'

const route = useRoute()
const router = useRouter()
const editor = useEditorStore()
const grid = useGridStore()
const auth = useAuthStore()
const player = usePlayerSettingsStore()
const solveSession = useSolveSessionStore()
const presence = usePresenceStore()
const competition = useCompetitionStore()
const isMobile = useIsMobile()

// Removed by the host mid-session: stop server sync, keep solving locally, and
// surface a dismissible banner.
const dismissedKick = ref(false)
const showKickedBanner = computed(() => presence.wasKicked && !dismissedKick.value)
watch(() => presence.wasKicked, (kicked) => {
  if (kicked) solveSession.detachServer()
})

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const title = ref('')
const author = ref<{ username: string; displayName: string } | null>(null)
const authorId = ref<string | null>(null)
const authorCredit = ref<string | null>(null)
const puzzleId = ref<string | null>(null)
const myRating = ref<{ stars: number | null; difficultyVote: number | null } | null>(null)
// Bundled for SolvedModal's rating section: logged-in solvers who aren't the
// author (authors set difficulty via the setter tool and never rate their own).
const ratingContext = computed(() => ({
  puzzleId: puzzleId.value,
  canRate: auth.isAuthenticated && authorId.value !== (auth.user?.id ?? null),
  stars: myRating.value?.stars ?? null,
  difficulty: myRating.value?.difficultyVote ?? null,
}))
const isFavorited = ref(false)
const favoriteCount = ref(0)
// Shown in the Solved modal alongside rating, so it follows the same gate:
// logged-in solvers who aren't the author. Null hides the control.
const favorite = computed(() =>
  ratingContext.value.canRate && puzzleId.value
    ? { puzzleId: puzzleId.value, isFavorited: isFavorited.value, favoriteCount: favoriteCount.value }
    : null,
)
const solutionHash = ref<string | null>(null)
const solved = ref(false)
const solveMessage = ref<string | null>(null)
const showReset = ref(false)
const showRulesIntro = ref(false)
const showCheckResult = ref(false)
const checkResult = ref<CheckResultEnum>('INCORRECT')
const showSettings = ref(false)
const showCollaboration = ref(false)

// In a competition run, checking is replaced wholesale by blind/scored
// submission: the server rejects CheckSolution anyway, so the UI never offers it.
const inCompetition = computed(() =>
  (collectionId.value ? competition.isActiveFor(collectionId.value) : false))
// The competition banner owns the whole submit flow (confirm step, toast); the
// check button routes into it via this ref.
const competitionUi = ref<InstanceType<typeof CompetitionSolveBanner> | null>(null)

// Empty = a live (non-void) cell with neither a given nor a placed digit.
// Pencil marks don't count; that's exactly the trap the confirm modal exists for.
const emptyCellCount = computed(() => {
  let empty = 0
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const key = cellKey(r, c)
      if (grid.isVoid(key)) continue
      if ((editor.givenDigits[key] ?? editor.solverCellStates[key]?.value ?? null) === null) empty++
    }
  }
  return empty
})

// Manual "Check Solution": ask the server (which has the solution) for a coarse
// verdict. A complete-and-correct board routes to the normal win flow; anything
// else opens the result modal (which honours the reveal-partial-progress
// setting). Always available, regardless of the auto-check setting.
async function runCheck() {
  if (!puzzleId.value) return
  if (inCompetition.value) return competitionUi.value?.requestSubmit()
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
  solveSession.scheduleSave() // persist the cleared board (and reset clock)
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
// Present when the user followed a collaboration share link — load INTO the
// shared play rather than the user's own.
const joinToken = computed(() => (typeof route.query.join === 'string' ? route.query.join : null))

// Optional collection context: when playing inside a collection, we offer
// "next puzzle" navigation. `ct` carries the collection's share token (unlisted).
const collectionId = computed(() => (typeof route.query.collection === 'string' ? route.query.collection : null))
const collectionToken = computed(() => (typeof route.query.ct === 'string' ? route.query.ct : null))
const collectionTitle = ref('')
const collectionTimed = ref(false)
// Puzzles in collection order, each with its own share token (present for
// container-only puzzles) so next-puzzle navigation can build a working link.
const orderedPuzzles = ref<{ id: string; token: string | null }[]>([])
// Entry points by puzzle id; null when the author hides per-puzzle points.
const puzzlePoints = ref<Record<string, number | null>>({})

// Competition banner data.
const competitionPoints = computed(() =>
  (puzzleId.value ? puzzlePoints.value[puzzleId.value] ?? null : null))
const collectionPuzzleIds = computed(() => orderedPuzzles.value.map((p) => p.id))

// Pausable solving timer — runs for every puzzle. Timed collections also feed
// its elapsed value to the leaderboard on solve.
const timer = usePuzzleTimer()
const { label: timerLabel, paused: timerPaused } = timer
const showTimer = computed(() => !player.effective.hideTimer)
const nextEntry = computed(() => {
  if (!puzzleId.value) return null
  const idx = orderedPuzzles.value.findIndex((p) => p.id === puzzleId.value)
  return idx >= 0 && idx < orderedPuzzles.value.length - 1 ? orderedPuzzles.value[idx + 1] : null
})
const nextId = computed(() => nextEntry.value?.id ?? null)

async function loadCollectionOrder() {
  if (!collectionId.value) return
  let payload: CollectionPublicQuery['collection'] = null
  if (collectionToken.value) {
    const { data } = await apolloClient.query<CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables>({
      query: CollectionByTokenPublicDocument, variables: { token: collectionToken.value }, fetchPolicy: 'network-only',
    })
    payload = data?.collectionByToken ?? null
  } else {
    const { data } = await apolloClient.query<CollectionPublicQuery, CollectionPublicQueryVariables>({
      query: CollectionPublicDocument, variables: { id: collectionId.value }, fetchPolicy: 'network-only',
    })
    payload = data?.collection ?? null
  }
  collectionTitle.value = payload?.title ?? ''
  collectionTimed.value = payload?.timed ?? false
  orderedPuzzles.value = payload?.puzzles.map((p) => ({ id: p.id, token: p.shareToken ?? null })) ?? []
  puzzlePoints.value = Object.fromEntries(
    (payload?.entries ?? []).filter((e) => e.puzzle).map((e) => [e.puzzle!.id, e.points ?? null]),
  )
  // Competition context: hydrate the run (enforced settings, submit state)
  // BEFORE the session/timer starts so overrides apply from the first paint.
  if (payload?.kind === CollectionKindEnum.Competition) {
    competition.hydrateFromCollection(payload, collectionToken.value)
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
    if (solved.value || !solutionHash.value || !player.effective.checkOnFinish) return
    if (hashSolution(boardSnapshot(editor, grid)) === solutionHash.value) onSolved()
  },
  { deep: true },
)

// Autosave: persist the session whenever the board, selection, input mode, or
// pause state changes. The store debounces the server push (and writes
// localStorage synchronously), so a flurry of edits batches into one request.
// Elapsed time isn't watched (it ticks every second); it rides along on the next
// content change and is captured on flush (tab-hide / unload / navigation).
watch(
  () => [editor.solverCellStates, editor.selection, editor.inputMode, editor.penState, timerPaused.value],
  () => solveSession.scheduleSave(),
  { deep: true },
)

// On a correct solve, authoritatively record it server-side (the server
// re-validates the board) for logged-in users and guests alike, and reveal the
// author's custom solve message from the response (it's never sent in the puzzle
// data). Falls back to the default message if there is none / recording fails.
async function onSolved() {
  solved.value = true
  timer.stop()
  if (puzzleId.value) markSolved(puzzleId.value)
  solveSession.markSolvedAndStop() // persist the solved board once, then stop autosaving
  // Record the time for the leaderboard (logged-in solvers, timed collections).
  if (collectionTimed.value && collectionId.value && puzzleId.value && auth.isAuthenticated && timer.elapsed.value > 0) {
    apolloClient.mutate<RecordCollectionSolveTimeMutation, RecordCollectionSolveTimeMutationVariables>({
      mutation: RecordCollectionSolveTimeDocument,
      variables: { collectionId: collectionId.value, puzzleId: puzzleId.value, seconds: timer.elapsed.value },
    }).catch(() => { /* best-effort */ })
  }
  if (!puzzleId.value) return
  try {
    const { data } = await apolloClient.mutate<SubmitSolutionMutation, SubmitSolutionMutationVariables>({
      mutation: SubmitSolutionDocument,
      variables: {
        puzzleId: puzzleId.value,
        cellState: boardSnapshot(editor, grid),
        timeElapsedSeconds: timer.elapsed.value,
        shareToken: shareToken.value,
      },
    })
    solveMessage.value = data?.submitSolution?.solveMessage ?? null
  } catch {
    // Keep the default message if recording fails.
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
  dismissedKick.value = false
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
    authorId.value = puzzle.author?.id ?? null
    authorCredit.value = puzzle.authorName ?? null
    isFavorited.value = puzzle.isFavorited ?? false
    favoriteCount.value = puzzle.favoriteCount ?? 0
    puzzleId.value = puzzle.id
    myRating.value = puzzle.myRating ?? null
    solutionHash.value = puzzle.publishedVersion.solutionHash ?? null
    deserializePuzzle(editor, grid, puzzle.publishedVersion.definition as SerializedPuzzle)
    // Fog of War verification data (present only when the puzzle uses fog).
    // Set after deserializePuzzle — editor.reset() clears these refs.
    editor.fogCellHashes = (puzzle.publishedVersion.fogCellHashes as Record<string, string> | null) ?? null
    editor.fogHashSalt = solutionHash.value
    editor.setMode('solving')
    // Resume saved progress if any (restores the board, history, and timer);
    // otherwise begin() starts the clock fresh. It owns the timer from here, so
    // we no longer call timer.start() directly.
    const resumed = await solveSession.begin({
      puzzleId: puzzle.id,
      solutionHash: solutionHash.value,
      timer,
      joinToken: joinToken.value,
      shareToken: shareToken.value,
    })
    // Greet the solver with the rules on a fresh start (when enabled), pausing
    // the clock until dismissed. Skip on resume and when there's no rules text.
    if (!resumed && player.effective.showRulesOnStart && editor.puzzleRules) openRules()
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

// Re-load when navigating between puzzles in a collection (same route). Flush
// the outgoing puzzle's progress before the next one resets the board.
watch(() => route.params.id, async () => {
  await solveSession.flush()
  loadPuzzle()
})

// Persist on tab-hide / app-background and on page unload. visibilitychange is
// the reliable primary (covers tab switches and mobile backgrounding); pagehide
// is the more dependable unload signal than beforeunload (esp. mobile Safari).
function flushOnHide() {
  if (document.visibilityState === 'hidden') void solveSession.flush()
}
function flushOnPageHide() {
  void solveSession.flush()
}

onMounted(async () => {
  document.addEventListener('visibilitychange', flushOnHide)
  window.addEventListener('pagehide', flushOnPageHide)
  await loadCollectionOrder() // sets collectionTimed before the timer can start
  loadPuzzle()
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', flushOnHide)
  window.removeEventListener('pagehide', flushOnPageHide)
  void solveSession.flush()
  solveSession.teardown()
  timer.stop()
  // Leave a clean slate so the editor store isn't holding a played puzzle.
  editor.reset()
})
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <KickedBanner
      v-if="showKickedBanner"
      @dismiss="dismissedKick = true"
    />

    <CompetitionSolveBanner
      ref="competitionUi"
      :puzzle-id="puzzleId"
      :collection-id="collectionId"
      :puzzle-ids="collectionPuzzleIds"
      :points="competitionPoints"
      :empty-cell-count="emptyCellCount"
      :board="() => boardSnapshot(editor, grid)"
    />

    <div
      v-if="loading || errorMessage"
      class="flex-1 flex items-center justify-center text-soft"
    >
      {{ loading ? 'Loading…' : errorMessage }}
    </div>

    <PlayerLayout
      v-else
      :is-mobile="isMobile"
      :title="title"
      :author="author"
      :author-name="authorCredit"
      :rules="editor.puzzleRules"
      :show-timer="showTimer"
      :elapsed-label="timerLabel"
      :paused="timerPaused"
      :collaboration-enabled="player.effective.enableCollaborationMode"
      :check-label="inCompetition ? 'Submit solution' : undefined"
      @toggle-pause="timer.toggle()"
      @reset="showReset = true"
      @show-rules="openRules"
      @check="runCheck"
      @settings="showSettings = true"
      @collaborate="showCollaboration = true"
    />

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
      :reveal-partial="player.effective.revealPartialProgress"
      @close="showCheckResult = false"
    />

    <PlayerSettingsModal
      v-if="showSettings"
      @close="showSettings = false"
    />
    <CollaborationModal
      v-if="showCollaboration"
      :puzzle-id="puzzleId"
      @close="showCollaboration = false"
    />

    <SolvedModal
      v-if="solved"
      :title="title"
      :solve-message="solveMessage"
      :in-collection="!!collectionId"
      :has-next="!!nextId"
      :collection-title="collectionTitle"
      :rating="ratingContext"
      :favorite="favorite"
      @close="solved = false"
      @next="goToNext"
      @back="backToCollection"
    />
  </div>
</template>
