<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import NumpadPanel from './NumpadPanel.vue'

const editor = useEditorStore()

const modes = [
  { key: 'digit' as const, label: 'Full\nDigits' },
  { key: 'center' as const, label: 'Center\nMarks' },
  { key: 'corner' as const, label: 'Corner\nMarks' },
]
</script>

<template>
  <div class="flex bg-white overflow-y-auto h-full p-4 gap-2">
    <div class="flex-1 min-w-0">
      <NumpadPanel
        @digit="editor.placeDigitForSelection($event || null)"
        @delete="editor.placeDigitForSelection(null)"
      />
    </div>
    <!-- Input mode column -->
    <div class="flex flex-col gap-1.5 shrink-0 w-14 justify-start pt-0.5">
      <button
        v-for="m in modes"
        :key="m.key"
        class="w-full py-2 rounded-lg border text-[10px] font-semibold leading-tight text-center transition-colors whitespace-pre-line"
        :class="editor.effectiveInputMode === m.key
          ? 'bg-blue-500 text-white border-blue-500'
          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'"
        @click="editor.setInputMode(m.key)"
      >
        {{ m.label }}
      </button>
    </div>
  </div>
</template>
