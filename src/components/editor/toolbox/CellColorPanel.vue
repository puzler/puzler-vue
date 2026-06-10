<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

function onColorInput(event: Event) {
  editor.updateActiveCellColorPreset({ color: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-line">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
          Colors
        </p>
        <button
          class="text-[11px] text-action hover:text-action font-medium transition-colors"
          @click="editor.addCellColorPreset()"
        >
          + Add
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="preset in editor.cellColorPresets"
          :key="preset.id"
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
          :class="preset.id === editor.activeCellColorPresetId
            ? 'bg-action-tint text-action ring-1 ring-inset ring-action/30'
            : 'text-ink-text hover:bg-line/60'"
          @click="editor.setActiveCellColorPreset(preset.id)"
        >
          <span
            class="w-5 h-5 rounded-sm border border-line shrink-0"
            :style="{ background: preset.color }"
          />
          <span class="text-sm truncate">{{ preset.label }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="editor.activeCellColorPreset"
      class="flex flex-col gap-3 px-3 py-3"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-soft">Color</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="editor.activeCellColorPreset.color"
            class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
            @input="onColorInput"
          >
          <span class="text-xs text-faint font-mono">{{ editor.activeCellColorPreset.color }}</span>
        </div>
      </div>
      <p class="text-[11px] text-faint leading-snug">
        Drag to paint · Click a painted cell to erase
      </p>
    </div>
  </div>
</template>
