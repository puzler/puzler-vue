import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { normalizeEnforced } from '@/utils/playerSettings'
import StartCompetitionRunDocument from '@/graphql/gql/competitions/StartCompetitionRun.graphql'
import SubmitCompetitionEntryDocument from '@/graphql/gql/competitions/SubmitCompetitionEntry.graphql'
import FinishCompetitionRunDocument from '@/graphql/gql/competitions/FinishCompetitionRun.graphql'
import MyActiveCompetitionRunDocument from '@/graphql/gql/competitions/MyActiveCompetitionRun.graphql'
import type {
  StartCompetitionRunMutation, StartCompetitionRunMutationVariables,
  SubmitCompetitionEntryMutation, SubmitCompetitionEntryMutationVariables,
  FinishCompetitionRunMutation, FinishCompetitionRunMutationVariables,
  MyActiveCompetitionRunQuery,
  CompetitionSubmissionPolicyEnum,
} from '@/graphql/generated/types'

export interface CompetitionSubmissionState {
  submittedAt: string
  correct: boolean | null
  wrongAttempts: number | null
}

export interface ActiveRun {
  runId: string
  collectionId: string
  collectionTitle: string
  shareToken: string | null
  policy: CompetitionSubmissionPolicyEnum
  // Date.now() + secondsRemaining*1000, computed ONCE per hydrate. The server
  // is the clock; local ticks only measure time since the fetch, so client
  // clock skew can't stretch or shrink a run.
  deadlineEpochMs: number
  submissions: Record<string, CompetitionSubmissionState>
}

// The viewer's active competition run, app-wide: powers the global bar, the
// in-run collection page, and the solver's submit flow. Also owns the
// enforced-settings lifecycle (applied while a run is active, cleared after).
export const useCompetitionStore = defineStore('competition', () => {
  const run = ref<ActiveRun | null>(null)
  const enforced = ref<Record<string, boolean>>({})
  const now = ref(Date.now())

  let ticker: ReturnType<typeof setInterval> | null = null
  function startTicker() {
    if (ticker) return
    ticker = setInterval(() => { now.value = Date.now() }, 1000)
  }
  function stopTicker() {
    if (ticker) clearInterval(ticker)
    ticker = null
  }

  const remainingSeconds = computed(() => {
    if (!run.value) return 0
    return Math.max(0, Math.ceil((run.value.deadlineEpochMs - now.value) / 1000))
  })

  const isActive = computed(() => run.value !== null && remainingSeconds.value > 0)

  const remainingLabel = computed(() => {
    const total = remainingSeconds.value
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
    return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
  })

  function isActiveFor(collectionId: string): boolean {
    return isActive.value && run.value?.collectionId === collectionId
  }

  function hydrateRun(next: ActiveRun | null, enforcedSettings: Record<string, boolean> = {}) {
    run.value = next
    enforced.value = next ? enforcedSettings : {}
    if (next) { now.value = Date.now(); startTicker() } else stopTicker()
  }

  type RunPayload = {
    id: string
    secondsRemaining: number
    finishedAt?: string | null
    submissions?: { puzzleId: string; submittedAt: string; correct?: boolean | null; wrongAttempts?: number | null }[]
  }

  function toSubmissions(payload: RunPayload): Record<string, CompetitionSubmissionState> {
    return Object.fromEntries((payload.submissions ?? []).map((s) => [
      s.puzzleId,
      { submittedAt: s.submittedAt, correct: s.correct ?? null, wrongAttempts: s.wrongAttempts ?? null },
    ]))
  }

  // Feed from a collection page/player payload (CollectionPublicFields shape).
  function hydrateFromCollection(collection: {
    id: string
    title: string
    shareToken?: string | null
    competitionConfig?: { submissionPolicy: CompetitionSubmissionPolicyEnum; enforcedSettings?: unknown } | null
    myCompetitionRun?: (RunPayload & { finalized: boolean }) | null
  }, shareToken: string | null = null) {
    const payload = collection.myCompetitionRun
    const config = collection.competitionConfig
    if (!payload || !config || payload.finalized || payload.finishedAt || payload.secondsRemaining <= 0) {
      if (run.value?.collectionId === collection.id) hydrateRun(null)
      return
    }
    hydrateRun({
      runId: payload.id,
      collectionId: collection.id,
      collectionTitle: collection.title,
      shareToken: shareToken ?? collection.shareToken ?? null,
      policy: config.submissionPolicy,
      deadlineEpochMs: Date.now() + payload.secondsRemaining * 1000,
      submissions: toSubmissions(payload),
    }, normalizeEnforced(config.enforcedSettings))
  }

  // App-boot hydration so the bar survives refresh on any page.
  async function refreshActiveRun() {
    const { data } = await apolloClient.query<MyActiveCompetitionRunQuery>({
      query: MyActiveCompetitionRunDocument, fetchPolicy: 'network-only',
    })
    const payload = data?.myActiveCompetitionRun
    if (!payload) {
      hydrateRun(null)
      return
    }
    hydrateRun({
      runId: payload.id,
      collectionId: payload.collection.id,
      collectionTitle: payload.collection.title,
      shareToken: payload.collection.shareToken ?? null,
      policy: payload.collection.competitionConfig?.submissionPolicy ?? ('BLIND' as CompetitionSubmissionPolicyEnum),
      deadlineEpochMs: Date.now() + payload.secondsRemaining * 1000,
      submissions: {},
    }, normalizeEnforced(payload.collection.competitionConfig?.enforcedSettings))
  }

  async function start(collectionId: string, shareToken: string | null): Promise<string | null> {
    const { data } = await apolloClient.mutate<StartCompetitionRunMutation, StartCompetitionRunMutationVariables>({
      mutation: StartCompetitionRunDocument, variables: { collectionId, shareToken },
    })
    const result = data?.startCompetitionRun
    if (!result?.run) return result?.errors?.[0] ?? 'Could not start the competition'
    return null
  }

  async function submit(puzzleId: string, cellState: Record<string, unknown>):
  Promise<{ accepted: boolean; correct: boolean | null; error: string | null }> {
    if (!run.value) return { accepted: false, correct: null, error: 'No active run' }
    // Never let a failed mutation throw past the caller: an unsurfaced error
    // here looks exactly like a successful submission to the player.
    let result: SubmitCompetitionEntryMutation['submitCompetitionEntry']
    try {
      const { data } = await apolloClient.mutate<SubmitCompetitionEntryMutation, SubmitCompetitionEntryMutationVariables>({
        mutation: SubmitCompetitionEntryDocument,
        variables: { collectionId: run.value.collectionId, puzzleId, cellState },
      })
      result = data?.submitCompetitionEntry ?? null
    } catch (e) {
      const message = (e as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message
      return { accepted: false, correct: null, error: message ?? 'Could not submit. Check your connection and try again.' }
    }
    if (!result?.accepted) return { accepted: false, correct: null, error: result?.errors?.[0] ?? 'Could not submit' }
    const previous = run.value.submissions[puzzleId]
    run.value.submissions[puzzleId] = {
      submittedAt: new Date().toISOString(),
      correct: result.correct ?? null,
      wrongAttempts: result.correct === false
        ? (previous?.wrongAttempts ?? 0) + 1
        : previous?.wrongAttempts ?? null,
    }
    return { accepted: true, correct: result.correct ?? null, error: null }
  }

  async function finish(): Promise<void> {
    if (!run.value) return
    await apolloClient.mutate<FinishCompetitionRunMutation, FinishCompetitionRunMutationVariables>({
      mutation: FinishCompetitionRunDocument, variables: { collectionId: run.value.collectionId },
    })
    hydrateRun(null)
  }

  // Why a submission for this puzzle would be refused right now, or null when
  // it can go ahead. The message doubles as user-facing feedback.
  function submitBlockReason(puzzleId: string): string | null {
    if (!isActive.value || !run.value) return 'Time is up. This competition run is over.'
    if (run.value.policy === 'SINGLE' && puzzleId in run.value.submissions) {
      return 'Already submitted. This competition allows one submission per puzzle.'
    }
    return null
  }

  function canSubmit(puzzleId: string): boolean {
    return submitBlockReason(puzzleId) === null
  }

  function submissionState(puzzleId: string): 'none' | 'submitted' | 'correct' | 'incorrect' {
    const state = run.value?.submissions[puzzleId]
    if (!state) return 'none'
    if (state.correct === true) return 'correct'
    if (state.correct === false) return 'incorrect'
    return 'submitted'
  }

  // Enforced settings ride the run's lifecycle. Collaboration is always
  // hard-blocked during a run, whatever the author chose.
  const player = usePlayerSettingsStore()
  watch(isActive, (active) => {
    if (active) player.setOverrides({ ...enforced.value, enableCollaborationMode: false })
    else player.clearOverrides()
  }, { immediate: false })

  return {
    run, isActive, isActiveFor, remainingSeconds, remainingLabel,
    hydrateFromCollection, refreshActiveRun, start, submit, finish,
    canSubmit, submitBlockReason, submissionState,
  }
})
