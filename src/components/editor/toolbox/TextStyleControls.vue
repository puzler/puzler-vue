<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import CosmeticPlacementControls from './CosmeticPlacementControls.vue'

const editor = useEditorStore()

function onColorInput(event: Event) {
  editor.updateActiveTextPresetStyle({ color: (event.target as HTMLInputElement).value })
}

function onFontSizeChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveTextPresetStyle({ fontSize: Math.max(8, Math.min(48, raw)) })
}
</script>

<template>
  <div
    v-if="editor.activeTextPreset"
    class="flex flex-col gap-3 px-3 py-3"
  >
    <CosmeticPlacementControls />

    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
      Style
    </p>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Color</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeTextPreset.style.color"
          class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
          @input="onColorInput"
        >
        <span class="text-xs text-faint font-mono">{{ editor.activeTextPreset.style.color }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Font size</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="editor.activeTextPreset.style.fontSize"
          min="8"
          max="48"
          class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
          @change="onFontSizeChange"
        >
        <span class="text-xs text-faint">px</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="px-3 py-1 rounded border text-sm transition-colors font-bold"
        :class="editor.activeTextPreset.style.bold
          ? 'border-action bg-action-tint text-action'
          : 'border-line text-soft hover:bg-line/40'"
        @click="editor.updateActiveTextPresetStyle({ bold: !editor.activeTextPreset.style.bold })"
      >
        B
      </button>
      <span class="text-xs text-soft">Bold</span>
    </div>
  </div>
</template>
