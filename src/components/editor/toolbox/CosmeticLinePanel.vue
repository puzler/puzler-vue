<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

function onColorInput(event: Event) {
  editor.updateActiveLinePreset({ color: (event.target as HTMLInputElement).value })
}

function onWidthChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveLinePreset({ strokeWidth: Math.max(1, Math.min(30, raw)) })
}

function onOpacityChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveLinePreset({ opacity: Math.max(0.1, Math.min(1, raw / 100)) })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-gray-100">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Lines
        </p>
        <button
          class="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
          @click="editor.addLinePreset()"
        >
          + Add
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="preset in editor.linePresets"
          :key="preset.id"
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
          :class="preset.id === editor.activeLinePresetId
            ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
            : 'text-gray-700 hover:bg-gray-100'"
          @click="editor.setActiveLinePreset(preset.id)"
        >
          <svg
            width="32"
            height="14"
            viewBox="0 0 32 14"
            class="shrink-0"
          >
            <path
              d="M 3 7 L 29 7"
              :stroke="preset.style.color"
              :stroke-width="Math.min(preset.style.strokeWidth, 8)"
              :opacity="preset.style.opacity"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
          <span class="text-sm truncate">{{ preset.label }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="editor.activeLinePreset"
      class="flex flex-col gap-3 px-3 py-3"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Color</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="editor.activeLinePreset.style.color"
            class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
            @input="onColorInput"
          >
          <span class="text-xs text-gray-400 font-mono">{{ editor.activeLinePreset.style.color }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Width</label>
        <div class="flex items-center gap-2">
          <input
            type="number"
            :value="editor.activeLinePreset.style.strokeWidth"
            min="1"
            max="30"
            class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
            @change="onWidthChange"
          >
          <span class="text-xs text-gray-400">px</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Opacity</label>
        <div class="flex items-center gap-2">
          <input
            type="number"
            :value="Math.round(editor.activeLinePreset.style.opacity * 100)"
            min="10"
            max="100"
            class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
            @change="onOpacityChange"
          >
          <span class="text-xs text-gray-400">%</span>
        </div>
      </div>
      <p class="text-[11px] text-gray-400 leading-snug">
        Click and drag to draw · Click an existing line to erase
      </p>
    </div>
  </div>
</template>
