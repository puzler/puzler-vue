<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { usePuzzleStore } from '@/stores/puzzle'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiContentSaveOutline, mdiCheck, mdiLoading } from '@mdi/js'

const puzzle = usePuzzleStore()
const route = useRoute()
const router = useRouter()

async function save() {
  if (puzzle.saveStatus === 'saving') return
  try {
    await puzzle.saveVersion()
    // After the first save, reflect the new id in the URL so reloads and shares
    // land on the editable puzzle.
    if (!route.params.id && puzzle.serverPuzzleId) {
      router.replace({ name: 'editor-edit', params: { id: puzzle.serverPuzzleId } })
    }
  } catch {
    // saveStatus/errorMessage on the store carry the failure for the UI.
  }
}
</script>

<template>
  <button
    :title="puzzle.saveStatus === 'error' ? (puzzle.errorMessage ?? 'Save failed') : 'Save'"
    aria-label="Save"
    class="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-white transition-colors disabled:opacity-70"
    :class="puzzle.saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-action hover:bg-action-deep'"
    :disabled="puzzle.saveStatus === 'saving'"
    @click="save"
  >
    <MdiIcon
      :path="puzzle.saveStatus === 'saving' ? mdiLoading : puzzle.saveStatus === 'saved' ? mdiCheck : mdiContentSaveOutline"
      :size="18"
      :class="{ 'animate-spin': puzzle.saveStatus === 'saving' }"
    />
    <span class="text-xs font-medium">
      {{ puzzle.saveStatus === 'saving' ? 'Saving' : puzzle.saveStatus === 'saved' ? 'Saved' : 'Save' }}
    </span>
  </button>
</template>
