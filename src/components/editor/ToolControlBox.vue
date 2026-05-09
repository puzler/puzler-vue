<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import NumpadPanel from './NumpadPanel.vue'
import SolverNumpad from './SolverNumpad.vue'

const editor = useEditorStore()
</script>

<template>
  <!-- Solving mode: full SolverNumpad with input mode selector -->
  <SolverNumpad v-if="editor.mode === 'solving'" class="w-full h-full" />

  <!-- Setting mode: tool-specific controls -->
  <div v-else class="flex flex-col items-center justify-center bg-white overflow-y-auto h-full p-4">
    <!-- Given Digits tool: numpad for entering given digits -->
    <div v-if="editor.activeTool === 'digit'" class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Digits
      </p>
      <NumpadPanel
        @digit="editor.placeDigitForSelection($event || null)"
        @delete="editor.placeDigitForSelection(null)"
      />
    </div>
    <!-- Other tool control boxes will be added here per tool -->
  </div>
</template>
