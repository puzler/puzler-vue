<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import NumpadPanel from '../NumpadPanel.vue'

const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Quadruples
      </p>
      <NumpadPanel
        @digit="editor.placeDigitForSelection($event || null)"
        @delete="editor.placeDigitForSelection(null)"
      />
      <p class="text-[11px] text-soft leading-snug text-center">
        Click a corner to place a clue, then type digits to add them · up to four per clue, repeats allowed · Backspace removes the last digit
      </p>
    </div>
  </div>
</template>
