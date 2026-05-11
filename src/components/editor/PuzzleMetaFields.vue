<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()
</script>

<template>
  <div class="px-2 py-3 border-b border-gray-100">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-2">
      Puzzle
    </p>
    <div class="flex flex-col gap-1.5 px-1">
      <input
        v-model="editor.puzzleName"
        placeholder="Puzzle name"
        class="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400"
      >
      <input
        v-model="editor.puzzleAuthor"
        placeholder="Author"
        class="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400"
      >
      <textarea
        v-model="editor.puzzleRules"
        placeholder="Rules..."
        rows="3"
        class="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 resize-none"
      />
    </div>
  </div>
</template>
