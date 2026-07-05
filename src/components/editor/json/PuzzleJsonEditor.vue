<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { parsePuzzleImport, type SerializedPuzzle } from '@/utils/puzzleExport'
import { migratePuzzleDocument } from '@/utils/puzzleMigrate'
import { validatePuzzle, type PuzzleIssue } from '@/utils/puzzleValidate'
import { formatPuzzleJson, applyPuzzleJson, bufferStatus, lineForIssuePath } from '@/utils/puzzleJson'
import { useCodeMirrorJson } from './useCodeMirrorJson'
import PuzzleJsonToolbar from './PuzzleJsonToolbar.vue'
import JsonWarningsModal from './JsonWarningsModal.vue'

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
// Everything blocking the apply, in full: parse/apply failures are a single
// pathless entry, validation failures the complete located list. Rendered in
// the expandable panel under the footer — never truncated.
const applyErrors = ref<LocatedIssue[] | null>(null)
const notice = ref<string | null>(null)

const host = ref<HTMLElement | null>(null)
const { getText, setText, syntaxError, isEmpty } = useCodeMirrorJson(host, {
  initialText: storeText.value,
  onDocChanged: () => {
    buffer.value = getText()
    applyErrors.value = null
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
  applyErrors.value = null
  notice.value = null
}

const canApply = computed(() => syntaxError.value === null && !isEmpty.value)

// Warnings hold the apply until the user approves them (weird-but-valid setter
// choices: stacked duplicates, exclusion conflicts, keys that will be dropped).
interface LocatedIssue extends PuzzleIssue {
  line: number | null
}
const pendingWarnings = ref<LocatedIssue[] | null>(null)
let pendingDoc: SerializedPuzzle | null = null

function fail(message: string) {
  applyErrors.value = [{ path: '', line: null, message }]
}

function apply() {
  const text = getText()
  let parsed
  try {
    parsed = migratePuzzleDocument(parsePuzzleImport(text))
  } catch (e) {
    fail(e instanceof Error ? e.message : 'Could not apply this document.')
    return
  }
  applyErrors.value = null
  const before = JSON.parse(JSON.stringify(parsePuzzleImport(storeText.value)))
  if (JSON.stringify(parsed) === JSON.stringify(before)) {
    notice.value = 'No changes to apply.'
    return
  }
  // Functionally broken documents are rejected; weird choices need a nod.
  // Issue paths speak the (migrated) document; resolving them against the
  // buffer text points at the offending line in what the user actually sees.
  const { errors, warnings } = validatePuzzle(parsed)
  const locate = (issue: PuzzleIssue): LocatedIssue => ({ ...issue, line: lineForIssuePath(text, issue.path) })
  if (errors.length) {
    applyErrors.value = errors.map(locate)
    return
  }
  if (warnings.length) {
    pendingDoc = parsed
    pendingWarnings.value = warnings.map(locate)
    return
  }
  runApply(parsed)
}

function confirmWarnings() {
  const doc = pendingDoc
  pendingDoc = null
  pendingWarnings.value = null
  if (doc) runApply(doc)
}

function cancelWarnings() {
  pendingDoc = null
  pendingWarnings.value = null
}

function runApply(doc: SerializedPuzzle) {
  const result = applyPuzzleJson(editor, grid, doc)
  if (!result.ok) {
    fail(result.error)
    return
  }
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
        v-if="applyErrors"
        class="text-xs text-grid-error mr-auto"
      >
        {{ applyErrors.length === 1 ? '1 problem' : `${applyErrors.length} problems` }}
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

    <!-- Full, scrollable error detail: messages carry line + path + type and
         must never truncate, on any width. -->
    <div
      v-if="applyErrors"
      data-testid="apply-errors"
      class="shrink-0 max-h-40 overflow-y-auto border-t border-line px-3 py-2 space-y-1.5"
    >
      <p
        v-for="(error, i) in applyErrors"
        :key="i"
        class="text-xs text-grid-error break-words"
      >
        <!-- One interpolation keeps the separating spaces (Vue condenses
             whitespace-only text nodes between elements). -->
        <span class="font-mono">{{ error.line != null ? `L${error.line} ` : '' }}{{ error.path ? `${error.path}: ` : '' }}</span>{{ error.message }}
      </p>
    </div>

    <JsonWarningsModal
      v-if="pendingWarnings"
      :warnings="pendingWarnings"
      @confirm="confirmWarnings"
      @cancel="cancelWarnings"
    />
  </div>
</template>
