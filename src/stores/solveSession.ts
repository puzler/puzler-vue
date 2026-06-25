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
  type SolveSnapshot,
  type SolverTimerLike,
} from '@/utils/solveSession'
import StartPlayDocument from '@/graphql/gql/puzzles/mutations/StartPlay.graphql'
import SaveProgressDocument from '@/graphql/gql/puzzles/mutations/SaveProgress.graphql'
import type {
  StartPlayMutation,
  StartPlayMutationVariables,
  SaveProgressMutation,
  SaveProgressMutationVariables,
} from '@/graphql/generated/types'

export interface BeginOptions {
  puzzleId: string
  solutionHash: string | null
  timer: SolverTimerLike & { start: () => void }
}

function pickNewer(a: SolveSnapshot | null, b: SolveSnapshot | null): SolveSnapshot | null {
  if (!a) return b
  if (!b) return a
  return a.progress.savedAt >= b.progress.savedAt ? a : b
}

// Owns the resume/autosave lifecycle for a solving session. PlayerView drives it:
// begin() on load, scheduleSave() on changes (debounced), flush() on leave.
// Logged-in users persist to the server; everyone gets a localStorage copy.
export const useSolveSessionStore = defineStore('solveSession', () => {
  const editor = useEditorStore()
  const palette = useColorPaletteStore()
  const auth = useAuthStore()

  const playId = ref<string | null>(null) // server PuzzlePlay id (logged-in only)
  const loading = ref(false)
  const active = ref(false) // autosave on (off while loading / once solved)

  let ctx: BeginOptions | null = null
  let lastServerJson: string | null = null

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

  // Begin (or resume) a session for a freshly-loaded puzzle. Call AFTER
  // deserializePuzzle + editor.reset(); it decides fresh-start vs resume and owns
  // the timer from here (so the caller must NOT also call timer.start()).
  // Resolves true when an in-progress session was resumed (the caller skips the
  // rules intro in that case), false on a fresh or already-solved start.
  async function begin(opts: BeginOptions): Promise<boolean> {
    teardown()
    ctx = opts
    loading.value = true
    let resumedSolved = false
    let didResume = false
    try {
      const local = readLocalSnapshot(opts.puzzleId)
      let snapshot: SolveSnapshot | null = local

      if (auth.isAuthenticated) {
        const server = await fetchServerPlay(opts.puzzleId)
        if (server === 'solved') {
          resumedSolved = true
          opts.timer.start()
          return false
        }
        // Newer of {server, local} wins (crash-safety + guest->login seeding).
        snapshot = pickNewer(server, local)
      }

      // Discard progress saved against a since-republished puzzle.
      if (
        snapshot?.progress.solutionHash &&
        opts.solutionHash &&
        snapshot.progress.solutionHash !== opts.solutionHash
      ) {
        snapshot = null
      }

      if (snapshot && !isEmptySnapshot(snapshot)) {
        applySession(editor, opts.timer, palette, snapshot)
        didResume = true
      } else {
        opts.timer.start()
      }
    } catch {
      opts.timer.start() // any failure -> fresh, never block solving
    } finally {
      loading.value = false
      active.value = !resumedSolved
    }
    return didResume
  }

  async function pushServer(): Promise<void> {
    if (!ctx || !playId.value || !auth.isAuthenticated) return
    const snap = snapshotNow()
    if (!snap) return
    const json = JSON.stringify(snap)
    if (json === lastServerJson) return // nothing changed since the last push
    lastServerJson = json
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
    } catch {
      lastServerJson = null // allow a retry on the next change
    }
  }

  const debouncedServerSave = useDebounceFn(() => { void pushServer() }, 2500, { maxWait: 30_000 })

  // Trailing-debounced autosave; call on every solver/timer change. localStorage
  // is written synchronously (instant resume / crash safety); the server push is
  // debounced so a flurry of edits batches into one request when it settles.
  function scheduleSave(): void {
    if (!active.value || !ctx) return
    const snap = snapshotNow()
    if (!snap) return
    writeLocalSnapshot(ctx.puzzleId, snap)
    if (auth.isAuthenticated && playId.value) void debouncedServerSave()
  }

  // Force an immediate save (no debounce). Call on tab-hide / pagehide / route
  // change / unmount so in-flight progress is never lost.
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

  function teardown(): void {
    active.value = false
    ctx = null
    playId.value = null
    lastServerJson = null
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
          // Seed the server only when it has nothing yet; otherwise the account's
          // existing progress reconciles on the next reload (last-write-wins).
          if (server !== 'solved' && (!server || isEmptySnapshot(server))) {
            lastServerJson = null
            await pushServer()
          }
        } catch {
          /* best-effort */
        }
      })()
    },
  )

  return { playId, loading, active, begin, scheduleSave, flush, markSolvedAndStop, teardown }
})
