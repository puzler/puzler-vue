<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col h-full p-3 gap-3">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
      Region
    </p>
    <p class="text-[11px] text-faint leading-snug">
      Select cells, then click a label to assign them to that region.
    </p>
    <div class="grid grid-cols-3 gap-1">
      <button
        v-for="n in [1,2,3,4,5,6,7,8,9]"
        :key="n"
        class="py-2 rounded border border-line text-sm font-mono font-semibold text-ink-text hover:bg-action-tint hover:border-action hover:text-action transition-colors"
        @click="editor.setRegionForSelection(String(n))"
      >
        {{ n }}
      </button>
    </div>
    <div class="grid grid-cols-3 gap-1">
      <button
        class="py-2 rounded border border-line text-sm font-mono font-semibold text-ink-text hover:bg-action-tint hover:border-action hover:text-action transition-colors"
        @click="editor.setRegionForSelection('0')"
      >
        0
      </button>
      <button
        class="col-span-2 py-2 rounded border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
        @click="editor.setRegionForSelection(null)"
      >
        Remove
      </button>
    </div>
    <p class="text-[11px] text-faint leading-snug">
      A–Z also accepted via keyboard.
    </p>
  </div>
</template>
