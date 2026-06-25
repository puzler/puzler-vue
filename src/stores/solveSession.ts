import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { apolloClient } from '@/utils/apolloClient'
import { useEditorStore } from './editor'
import { useColorPaletteStore } from './colorPalette'
import { useAuthStore } from './auth'
import {
  serializeSession,
  applySession,
  snapshotFromServer,
  readLocalSnapshot,
  writeLocalSnapshot,
  isEmptySnapshot,
  mergeRemoteCells,
  hasLocalChanges,
  isLiveUpdatesEnabled,
  setLiveUpdatesEnabledFor,
  type SolveSnapshot,
  type SolverTimerLike,
} from '@/utils/solveSession'
import type { CellState } from '@/types/grid'
import StartPlayDocument from '@/graphql/gql/puzzles/mutations/StartPlay.graphql'
import SaveProgressDocument from '@/graphql/gql/puzzles/mutations/SaveProgress.graphql'
import JoinPlaySessionDocument from '@/graphql/gql/puzzles/mutations/JoinPlaySession.graphql'
import ProgressUpdatedDocument from '@/graphql/gql/puzzles/subscriptions/ProgressUpdated.graphql'
import type {
  StartPlayMutation,
  StartPlayMutationVariables,
  SaveProgressMutation,
  SaveProgressMutationVariables,
  JoinPlaySessionMutation,
  JoinPlaySessionMutationVariables,
  ProgressUpdatedSubscription,
  ProgressUpdatedSubscriptionVariables,
} from '@/graphql/generated/types'

export interface BeginOptions {
  puzzleId: string
  solutionHash: string | null
  timer: SolverTimerLike & { start: () => void }
  joinToken?: string | null
}

function pickNewer(a: SolveSnapshot | null, b: SolveSnapshot | null): SolveSnapshot | null {
  if (!a) return b
  if (!b) return a
  return a.progress.savedAt >= b.progress.savedAt ? a : b
}

// Owns the resume/autosave/live-sync lifecycle for a solving session. PlayerView
// drives it: begin() on load, scheduleSave() on changes (debounced), flush() on
// leave. Logged-in users persist to the server and receive live updates (their
// own other tabs/devices now; collaborators in Phase 7) over the cable.
export const useSolveSessionStore = defineStore('solveSession', () => {
  const editor = useEditorStore()
  const palette = useColorPaletteStore()
  const auth = useAuthStore()

  const playId = ref<string | null>(null) // server PuzzlePlay id (logged-in only)
  const loading = ref(false)
  const active = ref(false) // autosave on (off while loading / once solved)
  const linked = ref(false) // another session (tab/device) is live on this play
  const liveUpdatesEnabled = ref(true) // per-device, per-puzzle apply toggle
  const joinError = ref<string | null>(null) // set when a ?join= attempt fails

  let ctx: BeginOptions | null = null
  let lastServerJson: string | null = null
  let lastSavedAt = 0 // savedAt of the snapshot we last pushed (for self-echo dedupe)
  // Last-known server cell map. Local cells diverging from this are "dirty" — the
  // unsynced edits we push, and the ones a remote merge must preserve.
  let baseline: Record<string, CellState> = {}
  let progressSub: { unsubscribe: () => void } | null = null

  function snapshotNow(): SolveSnapshot | null {
    if (!ctx) return null
    return serializeSession(editor, ctx.timer, palette, ctx.solutionHash)
  }

  // Find-or-create the user's server play. Returns its snapshot, 'solved' if the
  // session is already complete, or null if none / unauthenticated. Sets playId.
  async function fetchServerPlay(puzzleId: string): Promise<SolveSnapshot | 'solved' | null> {
    const { data } = await apolloClient.mutate<StartPlayMutation, StartPlayMutationVariables>({
      mutation: StartPlayDocument,
      variables: { puzzleId },
    })
    const play = data?.startPlay?.puzzlePlay
    if (!play) return null
    playId.value = play.id
    if (play.isSolved) return 'solved'
    return snapshotFromServer(play.cellState, play.progressState)
  }

  // Join a shared play via a token; sets playId to the SHARED play. Returns its
  // snapshot, or null (with joinError set) if the link is invalid/used/revoked.
  async function joinSharedPlay(token: string): Promise<SolveSnapshot | null> {
    try {
      const { data } = await apolloClient.mutate<JoinPlaySessionMutation, JoinPlaySessionMutationVariables>({
        mutation: JoinPlaySessionDocument,
        variables: { token },
      })
      const play = data?.joinPlaySession?.puzzlePlay
      if (!play) {
        joinError.value = data?.joinPlaySession?.errors?.[0] ?? 'Could not join this session'
        return null
      }
      playId.value = play.id
      return snapshotFromServer(play.cellState, play.progressState)
    } catch (e) {
      joinError.value = (e as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message
        ?? 'Could not join this session'
      return null
    }
  }

  // Begin (or resume) a session for a freshly-loaded puzzle. Call AFTER
  // deserializePuzzle + editor.reset(); it decides fresh-start vs resume, owns the
  // timer from here, and (logged-in) starts the live subscription. Resolves true
  // when an in-progress session was resumed (the caller skips the rules intro).
  async function begin(opts: BeginOptions): Promise<boolean> {
    teardown()
    ctx = opts
    loading.value = true
    liveUpdatesEnabled.value = isLiveUpdatesEnabled(opts.puzzleId)
    let resumedSolved = false
    let didResume = false
    try {
      const local = readLocalSnapshot(opts.puzzleId)
      let snapshot: SolveSnapshot | null = local

      if (opts.joinToken) {
        // Join mode: load INTO the shared play instead of the user's own.
        if (auth.isAuthenticated) {
          const joined = await joinSharedPlay(opts.joinToken)
          if (joined) snapshot = joined
        } else {
          joinError.value = 'Sign in to join this collaborative session.'
        }
      } else if (auth.isAuthenticated) {
        const server = await fetchServerPlay(opts.puzzleId)
        if (server === 'solved') {
          resumedSolved = true
          opts.timer.start()
          return false
        }
        snapshot = pickNewer(server, local)
      }

      if (
        snapshot?.progress.solutionHash &&
        opts.solutionHash &&
        snapshot.progress.solutionHash !== opts.solutionHash
      ) {
        snapshot = null // discard progress saved against a since-republished puzzle
      }

      if (snapshot && !isEmptySnapshot(snapshot)) {
        applySession(editor, opts.timer, palette, snapshot)
        didResume = true
      } else {
        opts.timer.start()
      }
      // Baseline = the board as the server has it right now (deep-cloned via
      // serialize), so subsequent edits register as dirty against it.
      baseline = snapshotNow()?.cellState ?? {}
      if (auth.isAuthenticated && playId.value) subscribeToProgress()
    } catch {
      opts.timer.start() // any failure -> fresh, never block solving
    } finally {
      loading.value = false
      active.value = !resumedSolved
    }
    return didResume
  }

  function subscribeToProgress(): void {
    if (!playId.value) return
    progressSub = apolloClient
      .subscribe<ProgressUpdatedSubscription, ProgressUpdatedSubscriptionVariables>({
        query: ProgressUpdatedDocument,
        variables: { puzzlePlayId: playId.value },
      })
      .subscribe({
        next: (result) => {
          const play = result.data?.progressUpdated?.puzzlePlay
          if (play) applyRemoteUpdate(snapshotFromServer(play.cellState, play.progressState))
        },
        error: () => {
          /* transient cable error; the ActionCable consumer reconnects on its own */
        },
      })
  }

  // Apply an incoming update from another session on this play.
  function applyRemoteUpdate(snap: SolveSnapshot): void {
    if (snap.progress.savedAt === lastSavedAt) return // our own broadcast echo
    linked.value = true
    if (!liveUpdatesEnabled.value || !ctx) return // this device opted out of live apply
    // Cell-level merge keeps this device's unsynced edits; adopt everything else.
    editor.solverCellStates = mergeRemoteCells(editor.solverCellStates, baseline, snap.cellState)
    baseline = snap.cellState
    editor.hydrateHistory(snap.progress.history) // shared undo/redo
    if (snap.progress.elapsed > ctx.timer.elapsed.value) ctx.timer.elapsed.value = snap.progress.elapsed // shared timer (max)
  }

  async function pushServer(): Promise<void> {
    if (!ctx || !playId.value || !auth.isAuthenticated) return
    const snap = snapshotNow()
    if (!snap) return
    const json = JSON.stringify(snap)
    if (json === lastServerJson) return
    try {
      await apolloClient.mutate<SaveProgressMutation, SaveProgressMutationVariables>({
        mutation: SaveProgressDocument,
        variables: {
          puzzlePlayId: playId.value,
          cellState: snap.cellState,
          timeElapsedSeconds: snap.progress.elapsed,
          progressState: snap.progress,
        },
      })
      lastServerJson = json
      baseline = snap.cellState // server now has exactly this
      lastSavedAt = snap.progress.savedAt
    } catch {
      /* leave baseline/lastServerJson untouched so the next change retries */
    }
  }

  const debouncedServerSave = useDebounceFn(() => { void pushServer() }, 2500, { maxWait: 30_000 })

  // Trailing-debounced autosave; call on every solver/timer change. localStorage
  // is written synchronously (instant resume / crash safety). The server push is
  // gated on local-vs-baseline changes — this both avoids no-op writes and breaks
  // the live-sync echo loop (an applied remote update leaves nothing dirty to push).
  function scheduleSave(): void {
    if (!active.value || !ctx) return
    const snap = snapshotNow()
    if (!snap) return
    writeLocalSnapshot(ctx.puzzleId, snap)
    if (auth.isAuthenticated && playId.value && hasLocalChanges(editor.solverCellStates, baseline)) {
      void debouncedServerSave()
    }
  }

  // Force an immediate save (no debounce). Call on tab-hide / pagehide / route
  // change / unmount so in-flight progress (incl. elapsed) is never lost.
  async function flush(): Promise<void> {
    if (!ctx) return
    const snap = snapshotNow()
    if (!snap) return
    writeLocalSnapshot(ctx.puzzleId, snap)
    if (auth.isAuthenticated && playId.value) await pushServer()
  }

  function markSolvedAndStop(): void {
    void flush() // persist the solved board, then stop autosaving
    active.value = false
  }

  // Toggle live-apply for this device + puzzle (surfaced via the "Linked" badge).
  // The device stays subscribed and keeps saving its own progress either way.
  function setLiveUpdates(enabled: boolean): void {
    liveUpdatesEnabled.value = enabled
    if (ctx) setLiveUpdatesEnabledFor(ctx.puzzleId, enabled)
  }

  function teardown(): void {
    active.value = false
    linked.value = false
    joinError.value = null
    ctx = null
    playId.value = null
    lastServerJson = null
    lastSavedAt = 0
    baseline = {}
    if (progressSub) {
      progressSub.unsubscribe()
      progressSub = null
    }
  }

  // Guest -> sign-in mid-solve: adopt a server play and seed it from the current
  // local state so progress isn't stranded on this device.
  watch(
    () => auth.user,
    (u) => {
      const session = ctx
      if (!u || !session || !active.value || playId.value) return
      void (async () => {
        try {
          const server = await fetchServerPlay(session.puzzleId)
          if (server !== 'solved' && (!server || isEmptySnapshot(server))) {
            await pushServer()
          }
          if (playId.value) subscribeToProgress()
        } catch {
          /* best-effort */
        }
      })()
    },
  )

  return {
    playId,
    loading,
    active,
    linked,
    liveUpdatesEnabled,
    joinError,
    begin,
    scheduleSave,
    flush,
    markSolvedAndStop,
    setLiveUpdates,
    teardown,
  }
})
