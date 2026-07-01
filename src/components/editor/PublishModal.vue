<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePuzzleStore } from '@/stores/puzzle'
import { PuzzleStatusEnum, PuzzleVisibilityEnum } from '@/graphql/generated/types'
import PuzzleSettingsModalShell from '@/components/puzzle/PuzzleSettingsModalShell.vue'
import PuzzleSettingsPanels from '@/components/puzzle/PuzzleSettingsPanels.vue'

// Publish & Share, opened from the editor. Reuses the same tabbed shell + panels
// as the puzzle-page Manage modal; the only differences are the heading and the
// primary action (publish/update a saved version vs. save settings).
const emit = defineEmits<{ close: [] }>()
const puzzle = usePuzzleStore()

const activeTab = ref('visibility')
const selectedMode = ref<PuzzleVisibilityEnum>(puzzle.visibility)
type CommentGate = 'inherit' | 'required' | 'open'
const commentGate = ref<CommentGate>(
  puzzle.commentsRequireSolveOverride == null ? 'inherit' : puzzle.commentsRequireSolveOverride ? 'required' : 'open',
)
function commentGateValue(): boolean | null {
  return commentGate.value === 'inherit' ? null : commentGate.value === 'required'
}

const busy = ref(false)
const error = ref<string | null>(null)
const isPublished = computed(() => puzzle.status === PuzzleStatusEnum.Published)
const versionToPublish = computed(() => puzzle.currentVersionId ?? puzzle.versions.at(-1)?.id ?? null)

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}

function publish() {
  if (!versionToPublish.value) {
    error.value = 'Save a version before publishing'
    return
  }
  run(async () => {
    await puzzle.publishVersion(versionToPublish.value!, selectedMode.value)
    // Cache the publish-page settings (comment gate + SudokuPad links) after the
    // version is live.
    await puzzle.configurePuzzlePage(commentGateValue())
  })
}
</script>

<template>
  <PuzzleSettingsModalShell
    v-model:active-tab="activeTab"
    heading="Publish &amp; Share"
    :error="error"
    @close="emit('close')"
  >
    <PuzzleSettingsPanels
      v-model:mode="selectedMode"
      v-model:comment-gate="commentGate"
      :active-tab="activeTab"
      :puzzle-id="puzzle.serverPuzzleId ?? ''"
      :busy="busy"
      @unpublish="run(() => puzzle.unpublish())"
    />
    <template #footer>
      <button
        class="ml-auto text-sm text-soft hover:text-ink-text"
        @click="emit('close')"
      >
        Done
      </button>
      <button
        class="px-4 py-2 rounded-xl bg-action text-on-action text-sm font-medium hover:bg-action-deep disabled:opacity-50"
        :disabled="busy"
        @click="publish"
      >
        {{ isPublished ? 'Update' : 'Publish' }}
      </button>
    </template>
  </PuzzleSettingsModalShell>
</template>
