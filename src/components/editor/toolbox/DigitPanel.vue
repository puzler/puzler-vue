<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import NumpadPanel from '../NumpadPanel.vue'

const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Digits
      </p>
      <NumpadPanel
        @digit="editor.placeDigitForSelection($event || null)"
        @delete="editor.placeDigitForSelection(null)"
      />
      <p class="text-[11px] text-gray-400 leading-snug text-center">
        Select cells and type to set givens · 0 or Backspace to clear
      </p>
    </div>
  </div>
</template>
