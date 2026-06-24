<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

// Style of the optional text rendered inside a shape (the per-object text is
// edited via CosmeticPlacementControls; this sets its colour and size).
const editor = useEditorStore()

function onTextColorInput(event: Event) {
  editor.updateActiveShapePreset({ textColor: (event.target as HTMLInputElement).value })
}

function onTextSizeChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveShapePreset({ textSize: Math.max(8, Math.min(48, raw)) })
}
</script>

<template>
  <template v-if="editor.activeShapePreset">
    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Text color</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeShapePreset.style.textColor"
          class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
          @input="onTextColorInput"
        >
        <span class="text-xs text-faint font-mono">{{ editor.activeShapePreset.style.textColor }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Text size</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="editor.activeShapePreset.style.textSize"
          min="8"
          max="48"
          class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
          @change="onTextSizeChange"
        >
        <span class="text-xs text-faint">px</span>
      </div>
    </div>
  </template>
</template>
