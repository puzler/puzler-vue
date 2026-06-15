<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import NumpadPanel from '../NumpadPanel.vue'

const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col items-center h-full min-h-0 p-3 gap-2 md:gap-3 md:p-4">
    <p class="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-soft">
      Digits
    </p>
    <!-- Pad fills the (fixed-height) bottom bar on mobile; wider 4-wide cap there,
         narrower 3-wide cap on the desktop sidebar -->
    <div class="flex-1 min-h-0 w-full flex items-center justify-center md:flex-none">
      <div class="w-full max-w-[15rem] md:max-w-[11rem]">
        <NumpadPanel
          @digit="editor.placeDigitForSelection($event || null)"
          @delete="editor.placeDigitForSelection(null)"
        />
      </div>
    </div>
    <p class="shrink-0 max-w-[12rem] text-[11px] text-soft leading-snug text-center">
      Select cells and type to set givens · 0 or Backspace to clear
    </p>
  </div>
</template>
