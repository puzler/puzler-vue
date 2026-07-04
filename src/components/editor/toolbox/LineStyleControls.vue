<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'draw', label: 'Draw' },
  { key: 'branch', label: 'Branch' },
]

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
  <div
    v-if="editor.activeLinePreset"
    class="flex flex-col gap-3 px-3 py-3"
  >
    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Color</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeLinePreset.style.color"
          class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
          @input="onColorInput"
        >
        <span class="text-xs text-faint font-mono">{{ editor.activeLinePreset.style.color }}</span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Width</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="editor.activeLinePreset.style.strokeWidth"
          min="1"
          max="30"
          class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
          @change="onWidthChange"
        >
        <span class="text-xs text-faint">px</span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Opacity</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="Math.round(editor.activeLinePreset.style.opacity * 100)"
          min="10"
          max="100"
          class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
          @change="onOpacityChange"
        >
        <span class="text-xs text-faint">%</span>
      </div>
    </div>
    <ModeSwitcher
      :modes="MODES"
      :active="editor.effectiveLineDrawMode"
      @select="editor.setLineDrawMode($event as 'draw' | 'branch')"
    />
    <p class="text-[11px] text-faint leading-snug">
      Draw: drag to add a line · tap one to erase. Branch: drag from an
      existing line to branch off it (or hold Shift).
    </p>
  </div>
</template>
