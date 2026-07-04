<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { parsePuzzleImport } from '@/utils/puzzleExport'
import { formatPuzzleJson, applyPuzzleJson, bufferStatus } from '@/utils/puzzleJson'
import { useCodeMirrorJson } from './useCodeMirrorJson'
import PuzzleJsonToolbar from './PuzzleJsonToolbar.vue'

const props = withDefaults(defineProps<{
  fullscreen?: boolean
  showFullscreenToggle?: boolean
}>(), {
  fullscreen: false,
  showFullscreenToggle: true,
})

const emit = defineEmits<{
  close: []
  'toggle-fullscreen': []
}>()

const editor = useEditorStore()
const grid = useGridStore()

// Serialize-on-read is cheap at puzzle sizes; Vue's dependency tracking turns
// this into the "puzzle changed outside the editor" detector.
const storeText = computed(() => formatPuzzleJson(editor, grid))

// The store text the buffer was last seeded from, and a reactive mirror of the
// buffer (CodeMirror's doc isn't reactive; onDocChanged keeps this in sync).
const baseline = ref(storeText.value)
const buffer = ref(storeText.value)
const stale = ref(false)
const applyError = ref<string | null>(null)
const notice = ref<string | null>(null)

const host = ref<HTMLElement | null>(null)
const { getText, setText, syntaxError, isEmpty } = useCodeMirrorJson(host, {
  initialText: storeText.value,
  onDocChanged: () => {
    buffer.value = getText()
    applyError.value = null
    notice.value = null
  },
})

const status = computed(() => bufferStatus(buffer.value, baseline.value, storeText.value))

watch(storeText, () => {
  if (status.value === 'behind') {
    // Buffer untouched → follow the store silently.
    refreshFromStore()
  } else if (status.value === 'dirty-behind') {
    stale.value = true
  }
})

function refreshFromStore() {
  baseline.value = storeText.value
  buffer.value = storeText.value
  setText(storeText.value)
  stale.value = false
  applyError.value = null
  notice.value = null
}

const canApply = computed(() => syntaxError.value === null && !isEmpty.value)

function apply() {
  let parsed
  try {
    parsed = parsePuzzleImport(getText())
  } catch (e) {
    applyError.value = e instanceof Error ? e.message : 'Could not apply this document.'
    return
  }
  applyError.value = null
  const before = JSON.parse(JSON.stringify(parsePuzzleImport(storeText.value)))
  if (JSON.stringify(parsed) === JSON.stringify(before)) {
    notice.value = 'No changes to apply.'
    return
  }
  applyPuzzleJson(editor, grid, parsed)
  // Re-seed with the canonical store form (compacted, migrations applied) so
  // the buffer reads pristine again.
  refreshFromStore()
  notice.value = 'Applied.'
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-surface">
    <PuzzleJsonToolbar
      :fullscreen="props.fullscreen"
      :show-fullscreen-toggle="props.showFullscreenToggle"
      @refresh="refreshFromStore"
      @close="emit('close')"
      @toggle-fullscreen="emit('toggle-fullscreen')"
    />

    <div
      v-if="stale"
      class="shrink-0 flex items-center gap-2 px-3 py-2 bg-spark-tint border-b border-line text-xs text-ink-text"
    >
      <span class="mr-auto">Puzzle changed outside the editor.</span>
      <button
        class="px-2 py-1 rounded-md border border-line bg-surface hover:bg-paper transition-colors"
        @click="refreshFromStore"
      >
        Discard edits &amp; reload
      </button>
    </div>

    <div
      ref="host"
      data-testid="cm-host"
      class="flex-1 min-h-0 overflow-hidden"
    />

    <div class="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-line">
      <p
        v-if="applyError"
        class="text-xs text-grid-error mr-auto truncate"
        :title="applyError"
      >
        {{ applyError }}
      </p>
      <p
        v-else-if="syntaxError"
        class="text-xs text-grid-error mr-auto truncate"
        :title="syntaxError"
      >
        Invalid JSON
      </p>
      <p
        v-else-if="notice"
        class="text-xs text-soft mr-auto"
      >
        {{ notice }}
      </p>
      <p
        v-else
        class="text-xs text-faint mr-auto"
      >
        Valid JSON
      </p>
      <button
        class="px-4 py-1.5 rounded-lg text-sm bg-action text-on-action hover:bg-action-deep transition-colors disabled:opacity-40 disabled:pointer-events-none"
        :disabled="!canApply"
        @click="apply"
      >
        Apply
      </button>
    </div>
  </div>
</template>
