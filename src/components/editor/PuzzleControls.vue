<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

const editor = useEditorStore()
const grid = useGridStore()

// ── New Grid modal ────────────────────────────────────────────────────────────
const showNewGrid = ref(false)
const pendingSize = ref(9)

function openNewGrid() {
  pendingSize.value = grid.rows
  showNewGrid.value = true
}

function confirmNewGrid() {
  grid.setDimensions(pendingSize.value, pendingSize.value)
  editor.reset()
  showNewGrid.value = false
}

// ── Export modal ──────────────────────────────────────────────────────────────
const showExport = ref(false)
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
  <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
    <!-- Setting / Solving toggle -->
    <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
      <button
        class="px-3 py-1.5 transition-colors"
        :class="editor.mode === 'setting' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'"
        @click="editor.setMode('setting')"
      >
        Setting
      </button>
      <button
        class="px-3 py-1.5 border-l border-gray-200 transition-colors"
        :class="editor.mode === 'solving' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'"
        @click="editor.setMode('solving')"
      >
        Solving
      </button>
    </div>

    <div class="w-px h-5 bg-gray-200" />

    <!-- New Grid — centered -->
    <div class="flex-1 flex justify-center">
      <button
        class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        @click="openNewGrid"
      >
        New Grid
      </button>
    </div>

    <!-- Actions -->
    <button
      class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      @click="showExport = true"
    >
      Export
    </button>
    <button class="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors">
      Save
    </button>
  </div>

  <!-- New Grid modal -->
  <Teleport to="body">
    <div
      v-if="showNewGrid"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showNewGrid = false"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 w-56 flex flex-col items-center gap-5">
        <span class="text-sm font-semibold text-gray-700">New Grid</span>

        <!-- Size selector -->
        <div class="flex items-center gap-3">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            :disabled="pendingSize <= 2"
            @click="pendingSize--"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="w-14 text-center text-lg font-semibold text-gray-800 tabular-nums">
            {{ pendingSize }}×{{ pendingSize }}
          </span>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            :disabled="pendingSize >= 16"
            @click="pendingSize++"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          class="w-full py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
          @click="confirmNewGrid"
        >
          Create
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Export modal -->
  <Teleport to="body">
    <div
      v-if="showExport"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showExport = false"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 w-72 flex flex-col gap-4">
        <span class="text-sm font-semibold text-gray-700">Export</span>

        <!-- Copy Puzzle Data option -->
        <button
          class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left"
          :class="copied
            ? 'border-green-400 bg-green-50 text-green-700'
            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700'"
          @click="copyPuzzleData"
        >
          <svg v-if="!copied" class="w-5 h-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          <svg v-else class="w-5 h-5 shrink-0 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <div class="flex flex-col">
            <span class="text-sm font-medium">{{ copied ? 'Copied!' : 'Copy Puzzle Data' }}</span>
            <span class="text-xs text-gray-400">Full puzzle JSON to clipboard</span>
          </div>
        </button>
      </div>
    </div>
  </Teleport>
</template>
