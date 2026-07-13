<script setup lang="ts">
import { computed, ref } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiCheckCircleOutline, mdiCircleOutline, mdiCloseCircleOutline } from '@mdi/js'
import { useCompetitionStore } from '@/stores/competition'
import CompetitionSubmitConfirmModal from '@/components/competitions/CompetitionSubmitConfirmModal.vue'
import CompetitionSubmitToast from '@/components/competitions/CompetitionSubmitToast.vue'

// The solver page's entire competition-submit surface: a banner under the
// global run bar (this puzzle's submission state, run-wide progress, and the
// big submit button), the empty-cells confirm step, and the feedback toast.
// Renders nothing when the current puzzle isn't part of the viewer's active
// run. The parent triggers the same flow from its own check button via the
// exposed requestSubmit().
const props = defineProps<{
  puzzleId: string | null
  collectionId: string | null
  // Collection puzzle ids, used to count submitted vs remaining.
  puzzleIds: string[]
  // Entry points for this puzzle; null when the author hides per-puzzle points.
  points: number | null
  // Live empty-cell count for the confirm gate.
  emptyCellCount: number
  // Builds the cellState payload at the moment of submission.
  board: () => Record<string, unknown>
}>()

const competition = useCompetitionStore()

const active = computed(() =>
  Boolean(props.puzzleId && props.collectionId && competition.isActiveFor(props.collectionId)))

const status = computed(() =>
  (props.puzzleId ? competition.submissionState(props.puzzleId) : 'none'))

const statusLabel = computed(() => {
  switch (status.value) {
    case 'correct': return 'Submitted, correct'
    case 'incorrect': return 'Submitted, incorrect'
    case 'submitted': return 'Submitted'
    default: return 'Not submitted yet'
  }
})

const statusIcon = computed(() => {
  if (status.value === 'incorrect') return mdiCloseCircleOutline
  return status.value === 'none' ? mdiCircleOutline : mdiCheckCircleOutline
})

const submittedCount = computed(() =>
  props.puzzleIds.filter((id) => competition.submissionState(id) !== 'none').length)
const remainingCount = computed(() => Math.max(0, props.puzzleIds.length - submittedCount.value))

// Info toasts auto-clear; errors stay up until dismissed, so a refused or
// failed submission can't slip by unnoticed.
const message = ref<string | null>(null)
const tone = ref<'info' | 'error'>('info')
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showConfirm = ref(false)

function showToast(text: string, kind: 'info' | 'error') {
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = null
  message.value = text
  tone.value = kind
  if (kind === 'info') toastTimer = setTimeout(() => { message.value = null }, 5000)
}

// Gate ahead of the actual submission: surface a blocked run immediately, and
// make submitting an unfinished board a deliberate choice rather than a slip.
function requestSubmit() {
  if (!props.puzzleId) return
  const blocked = competition.submitBlockReason(props.puzzleId)
  if (blocked) return showToast(blocked, 'error')
  if (props.emptyCellCount > 0) {
    showConfirm.value = true
    return
  }
  void submit()
}

function confirmSubmit() {
  showConfirm.value = false
  void submit()
}

async function submit() {
  if (!props.puzzleId) return
  const result = await competition.submit(props.puzzleId, props.board())
  if (!result.accepted) {
    showToast(result.error ?? 'Could not submit. Please try again.', 'error')
  } else if (result.correct === null) {
    showToast('Submitted. You can resubmit until time runs out; your last submission counts.', 'info')
  } else if (result.correct) {
    showToast('Correct! This puzzle is in the bank.', 'info')
  } else {
    showToast('Incorrect. That submission cost you the penalty.', 'info')
  }
}

defineExpose({ requestSubmit })
</script>

<template>
  <div
    v-if="active"
    class="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-action-tint border-b border-line"
  >
    <div class="flex flex-col gap-0.5 min-w-0">
      <span class="flex items-center gap-1.5 text-sm font-medium text-ink-text">
        <MdiIcon
          :path="statusIcon"
          :size="16"
          :class="status === 'incorrect' ? 'text-red-600' : status === 'none' ? 'text-soft' : 'text-green-600'"
        />
        <span class="truncate">This puzzle: {{ statusLabel }}</span>
        <span
          v-if="points !== null"
          class="shrink-0 px-1.5 py-0.5 rounded-md bg-white text-xs font-semibold text-action"
        >{{ points }} pts</span>
      </span>
      <span class="text-xs text-soft">
        {{ submittedCount }} of {{ puzzleIds.length }} puzzles submitted<template v-if="remainingCount > 0">, {{ remainingCount }} to go</template>
      </span>
    </div>

    <button
      type="button"
      class="w-full sm:w-auto sm:ml-auto px-6 py-2 rounded-xl bg-action text-on-action text-sm font-semibold shadow-sm hover:bg-action-deep transition-colors"
      @click="requestSubmit"
    >
      {{ status === 'none' ? 'Submit solution' : 'Resubmit solution' }}
    </button>
  </div>

  <CompetitionSubmitConfirmModal
    v-if="showConfirm"
    :empty-cell-count="emptyCellCount"
    @confirm="confirmSubmit"
    @cancel="showConfirm = false"
  />
  <CompetitionSubmitToast
    :message="message"
    :tone="tone"
    @dismiss="message = null"
  />
</template>
