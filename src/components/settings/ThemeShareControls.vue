<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { exportThemeCode, importThemeCode } from '@/utils/themeShare'

// Export the active theme to a copy-pasteable code, or import one as a new user theme. Lives in
// the editor modal footer so it works wherever the modal is opened.
const theme = useThemeStore()

const mode = ref<'idle' | 'export' | 'import'>('idle')
const code = ref('')
const pasted = ref('')
const status = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

function flash(msg: string) {
  status.value = msg
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { status.value = '' }, 2500)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(code.value)
    flash('Copied theme code')
  } catch {
    flash('Select the code and copy it')
  }
}

function onExport() {
  code.value = exportThemeCode(theme.activeTheme)
  mode.value = 'export'
  void copy()
}

function toggleImport() {
  mode.value = mode.value === 'import' ? 'idle' : 'import'
  pasted.value = ''
  status.value = ''
}

function onImportConfirm() {
  const parsed = importThemeCode(pasted.value)
  if (!parsed) {
    flash('That code could not be read')
    return
  }
  theme.importTheme(parsed)
  mode.value = 'idle'
  pasted.value = ''
  flash(`Imported "${parsed.name}"`)
}

function selectAll(e: FocusEvent) {
  (e.target as HTMLInputElement).select()
}

const btn = 'px-2.5 py-1 rounded-lg text-sm border border-line bg-surface hover:bg-line/40 transition-colors'
const field = 'flex-1 min-w-0 bg-paper border border-line rounded-lg px-2.5 py-1 text-sm text-ink-text focus:border-action focus:outline-none'
</script>

<template>
  <div class="px-5 py-2.5 border-t border-line flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        :class="btn"
        @click="onExport"
      >
        Export
      </button>
      <button
        type="button"
        :class="btn"
        @click="toggleImport"
      >
        {{ mode === 'import' ? 'Cancel' : 'Import' }}
      </button>
      <span
        v-if="status"
        class="text-xs text-soft"
      >{{ status }}</span>
    </div>
    <div
      v-if="mode === 'export'"
      class="flex items-center gap-2"
    >
      <input
        :value="code"
        readonly
        :class="field"
        aria-label="Theme code"
        @focus="selectAll"
      >
      <button
        type="button"
        :class="btn"
        @click="copy"
      >
        Copy
      </button>
    </div>
    <div
      v-else-if="mode === 'import'"
      class="flex items-center gap-2"
    >
      <input
        v-model="pasted"
        type="text"
        placeholder="Paste a theme code"
        :class="field"
        aria-label="Paste theme code"
        @keydown.enter="onImportConfirm"
      >
      <button
        type="button"
        :class="btn"
        @click="onImportConfirm"
      >
        Add
      </button>
    </div>
  </div>
</template>
