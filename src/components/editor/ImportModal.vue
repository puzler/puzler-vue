<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { usePuzzleStore } from '@/stores/puzzle'
import { deserializePuzzle, parsePuzzleImport, type SerializedPuzzle } from '@/utils/puzzleExport'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const emit = defineEmits<{ close: [] }>()

const editor = useEditorStore()
const grid = useGridStore()
const puzzle = usePuzzleStore()
const router = useRouter()

const text = ref('')
const error = ref<string | null>(null)
const pending = ref<SerializedPuzzle | null>(null)

// Validate first, then confirm — importing replaces the whole working puzzle.
function review() {
  error.value = null
  try {
    pending.value = parsePuzzleImport(text.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not read that JSON.'
  }
}

function doImport() {
  if (!pending.value) return
  deserializePuzzle(editor, grid, pending.value)
  puzzle.resetPuzzle() // imported puzzle is a fresh, unsaved local copy
  router.replace({ name: 'editor-new' })
  emit('close')
}
</script>

<template>
  <BaseModal
    size="xl"
    card-class="p-6 gap-4"
    @close="emit('close')"
  >
    <h2 class="font-display text-base font-semibold text-ink-text">
      Import puzzle JSON
    </h2>
    <textarea
      v-model="text"
      rows="12"
      placeholder="Paste exported puzzle JSON here…"
      class="w-full text-sm px-3 py-2 rounded-lg border border-line bg-surface text-ink-text leading-relaxed font-mono focus:outline-none focus:border-action resize-y"
      autofocus
    />
    <p
      v-if="error"
      class="text-xs text-red-600"
    >
      {{ error }}
    </p>
    <div class="flex gap-2 justify-end">
      <button
        class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="px-4 py-1.5 rounded-lg text-sm bg-action text-on-action hover:bg-action-deep transition-colors disabled:opacity-50"
        :disabled="!text.trim()"
        @click="review"
      >
        Import
      </button>
    </div>
  </BaseModal>

  <ConfirmModal
    v-if="pending"
    message="Importing replaces the puzzle you're currently editing. Continue?"
    confirm-label="Import"
    @confirm="doImport"
    @cancel="pending = null"
  />
</template>
