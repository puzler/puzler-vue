<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { exportToSudokuPad } from '@/utils/sudokuPadExport'

const editor = useEditorStore()
const grid = useGridStore()

// f-puzzles export → SudokuPad. Copy the link and open it so the setter can
// preview the converted puzzle immediately. Warnings list anything that
// couldn't be represented (and so needs re-creating by hand in SudokuPad).
const copied = ref(false)
const error = ref<string | null>(null)
const warnings = ref<string[]>([])
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function exportSudokuPad() {
  error.value = null
  warnings.value = []
  try {
    const result = exportToSudokuPad(editor, grid)
    await navigator.clipboard.writeText(result.url)
    warnings.value = result.warnings
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 2000)
    window.open(result.url, '_blank', 'noopener')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not export to SudokuPad.'
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 pt-3 border-t border-line">
    <div class="flex flex-col gap-0.5">
      <span class="text-sm font-semibold text-ink-text">SudokuPad</span>
      <span class="text-xs text-faint">Convert and open this puzzle in SudokuPad</span>
    </div>
    <button
      title="Copy a SudokuPad link and open it in a new tab"
      class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-colors"
      :class="copied
        ? 'border-green-400 bg-green-50 text-green-700'
        : 'border-line hover:border-action hover:bg-action-tint text-ink-text'"
      @click="exportSudokuPad"
    >
      <svg
        class="w-5 h-5"
        :class="copied ? 'text-green-500' : 'text-faint'"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        viewBox="0 0 24 24"
      >
        <path
          v-if="copied"
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
        />
        <path
          v-else
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
        />
      </svg>
      <span class="text-sm font-medium">{{ copied ? 'Link copied & opened!' : 'Export to SudokuPad' }}</span>
    </button>

    <p
      v-if="error"
      class="text-xs text-red-600"
    >
      {{ error }}
    </p>
    <div
      v-else-if="warnings.length"
      class="flex flex-col gap-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2"
    >
      <span class="text-xs font-medium text-amber-800">Some details couldn't be converted:</span>
      <ul class="list-disc list-inside text-xs text-amber-700">
        <li
          v-for="(warning, i) in warnings"
          :key="i"
        >
          {{ warning }}
        </li>
      </ul>
    </div>
  </div>
</template>
