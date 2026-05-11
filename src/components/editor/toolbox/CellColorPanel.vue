<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

function onColorInput(event: Event) {
  editor.updateActiveCellColorPreset({ color: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-gray-100">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Colors
        </p>
        <button
          class="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
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
            ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
            : 'text-gray-700 hover:bg-gray-100'"
          @click="editor.setActiveCellColorPreset(preset.id)"
        >
          <span
            class="w-5 h-5 rounded-sm border border-gray-300 shrink-0"
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
        <label class="text-xs text-gray-500">Color</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="editor.activeCellColorPreset.color"
            class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
            @input="onColorInput"
          >
          <span class="text-xs text-gray-400 font-mono">{{ editor.activeCellColorPreset.color }}</span>
        </div>
      </div>
      <p class="text-[11px] text-gray-400 leading-snug">
        Drag to paint · Click a painted cell to erase
      </p>
    </div>
  </div>
</template>
