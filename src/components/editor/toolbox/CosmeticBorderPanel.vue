<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import PresetRow from './PresetRow.vue'
import OpacityField from './OpacityField.vue'

const editor = useEditorStore()

function onColorInput(event: Event) {
  editor.updateActiveBorderPreset({ color: (event.target as HTMLInputElement).value })
}

function onWidthChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveBorderPreset({ strokeWidth: Math.max(0.5, Math.min(12, raw)) })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-line">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
          Borders
        </p>
        <button
          class="text-[11px] text-action hover:text-action font-medium transition-colors"
          @click="editor.addBorderPreset()"
        >
          + Add
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <PresetRow
          v-for="preset in editor.borderPresets"
          :key="preset.id"
          :label="preset.label"
          :active="preset.id === editor.activeBorderPresetId"
          :can-delete="editor.borderPresets.length > 1"
          @select="editor.setActiveBorderPreset(preset.id)"
          @duplicate="editor.duplicateBorderPreset(preset.id)"
          @remove="editor.removeBorderPreset(preset.id)"
          @rename="editor.renameBorderPreset(preset.id, $event)"
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
              stroke-linecap="square"
              fill="none"
            />
          </svg>
        </PresetRow>
      </div>
    </div>

    <div
      v-if="editor.activeBorderPreset"
      class="flex flex-col gap-3 px-3 py-3"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-soft">Color</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="editor.activeBorderPreset.style.color"
            class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
            @input="onColorInput"
          >
          <span class="text-xs text-faint font-mono">{{ editor.activeBorderPreset.style.color }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-soft">Width</label>
        <div class="flex items-center gap-2">
          <input
            type="number"
            :value="editor.activeBorderPreset.style.strokeWidth"
            min="0.5"
            max="12"
            step="0.5"
            class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
            @change="onWidthChange"
          >
          <span class="text-xs text-faint">px</span>
        </div>
      </div>
      <OpacityField
        :value="editor.activeBorderPreset.style.opacity"
        @change="editor.updateActiveBorderPreset({ opacity: $event })"
      />
      <p class="text-[11px] text-faint leading-snug">
        Drag along cell edges to draw borders · drag over an existing border to erase it.
        The default style matches region borders.
      </p>
    </div>
  </div>
</template>
