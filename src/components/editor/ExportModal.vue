<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle } from '@/utils/puzzleExport'

const emit = defineEmits<{ close: [] }>()

const editor = useEditorStore()
const grid = useGridStore()

const options = [
  { key: 'full', label: 'Full', title: 'Copy the full, indented puzzle JSON', minified: false },
  { key: 'minified', label: 'Minified', title: 'Copy compact single-line JSON', minified: true },
] as const

const copiedKey = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copy(option: (typeof options)[number]) {
  const data = serializePuzzle(editor, grid)
  const text = option.minified ? JSON.stringify(data) : JSON.stringify(data, null, 2)
  await navigator.clipboard.writeText(text)
  copiedKey.value = option.key
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copiedKey.value = null }, 2000)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl p-6 w-80 flex flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold text-ink-text">Export</span>
          <span class="text-xs text-faint">Copy this puzzle's data to the clipboard</span>
        </div>

        <div class="flex">
          <button
            v-for="(option, i) in options"
            :key="option.key"
            :title="option.title"
            class="flex-1 flex flex-col items-center justify-center gap-1.5 px-3 py-4 border transition-colors hover:z-10"
            :class="[
              i === 0 ? 'rounded-l-xl' : '-ml-px rounded-r-xl',
              copiedKey === option.key
                ? 'z-10 border-green-400 bg-green-50 text-green-700'
                : 'border-line hover:border-action hover:bg-action-tint text-ink-text',
            ]"
            @click="copy(option)"
          >
            <svg
              v-if="copiedKey !== option.key"
              class="w-5 h-5 text-faint"
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
              class="w-5 h-5 text-green-500"
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
            <span class="text-sm font-medium">{{ copiedKey === option.key ? 'Copied!' : option.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
