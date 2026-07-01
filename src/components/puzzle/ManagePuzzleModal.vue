<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { usePuzzleStore } from '@/stores/puzzle'
import { PuzzleVisibilityEnum } from '@/graphql/generated/types'
import PuzzleSettingsModalShell from './PuzzleSettingsModalShell.vue'
import PuzzleSettingsPanels from './PuzzleSettingsPanels.vue'

// Author-only "Manage puzzle" controls on the public puzzle page. The puzzle
// store is hydrated by the page (applyAdminFields) before this opens, so the
// store-backed actions work; the shared shell + panels are reused by the
// editor's Publish modal too.
defineProps<{ puzzleId: string; title: string }>()
const emit = defineEmits<{ close: [] }>()
const puzzle = usePuzzleStore()

const activeTab = ref('description')
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
const saved = ref(false)

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = null
  saved.value = false
  try {
    await action()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}

// Apply the visibility + comment-gate fields (only what changed). The rich
// description autosaves on its own via PageDescriptionEditor.
function save() {
  run(async () => {
    if (selectedMode.value !== puzzle.visibility) await puzzle.setVisibility(selectedMode.value)
    if (commentGateValue() !== puzzle.commentsRequireSolveOverride) await puzzle.configurePuzzlePage(commentGateValue())
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  })
}
</script>

<template>
  <PuzzleSettingsModalShell
    v-model:active-tab="activeTab"
    :heading="`Manage “${title}”`"
    :error="error"
    @close="emit('close')"
  >
    <PuzzleSettingsPanels
      v-model:mode="selectedMode"
      v-model:comment-gate="commentGate"
      :active-tab="activeTab"
      :puzzle-id="puzzleId"
      :busy="busy"
      @unpublish="run(() => puzzle.unpublish())"
    />
    <template #footer>
      <RouterLink
        :to="`/editor/${puzzleId}`"
        class="text-xs text-action hover:underline whitespace-nowrap"
      >
        Open in full editor
      </RouterLink>
      <button
        class="ml-auto text-sm text-soft hover:text-ink-text"
        @click="emit('close')"
      >
        Done
      </button>
      <button
        class="px-4 py-2 rounded-xl bg-action text-on-action text-sm font-medium hover:bg-action-deep disabled:opacity-50"
        :disabled="busy"
        @click="save"
      >
        {{ saved ? 'Saved!' : 'Save changes' }}
      </button>
    </template>
  </PuzzleSettingsModalShell>
</template>
