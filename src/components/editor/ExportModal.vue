<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

const emit = defineEmits<{ close: [] }>()

const editor = useEditorStore()
const grid = useGridStore()

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyPuzzleData() {
  const data = {
    version: 1,
    grid: {
      rows: grid.rows,
      cols: grid.cols,
      customCellRegions: grid.customCellRegions,
    },
    meta: {
      name: editor.puzzleName,
      author: editor.puzzleAuthor,
      rules: editor.puzzleRules,
    },
    givenDigits: editor.givenDigits,
    solverCellStates: editor.solverCellStates,
    activeConstraints: editor.activeConstraints,
    cosmetics: {
      cellColors: editor.cosmeticCellColors,
      instances: editor.cosmeticInstances,
      linePresets: editor.linePresets,
      shapePresets: editor.shapePresets,
      textPresets: editor.textPresets,
      cellColorPresets: editor.cellColorPresets,
    },
  }
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl p-6 w-72 flex flex-col gap-4">
        <span class="text-sm font-semibold text-ink-text">Export</span>

        <button
          class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left"
          :class="copied
            ? 'border-green-400 bg-green-50 text-green-700'
            : 'border-line hover:border-action hover:bg-action-tint text-ink-text'"
          @click="copyPuzzleData"
        >
          <svg
            v-if="!copied"
            class="w-5 h-5 shrink-0 text-faint"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
          <svg
            v-else
            class="w-5 h-5 shrink-0 text-green-500"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
          <div class="flex flex-col">
            <span class="text-sm font-medium">{{ copied ? 'Copied!' : 'Copy Puzzle Data' }}</span>
            <span class="text-xs text-faint">Full puzzle JSON to clipboard</span>
          </div>
        </button>
      </div>
    </div>
  </Teleport>
</template>
