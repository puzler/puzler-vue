<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import LineStyleControls from './LineStyleControls.vue'
import PresetRow from './PresetRow.vue'

const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-line">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
          Lines
        </p>
        <button
          class="text-[11px] text-action hover:text-action font-medium transition-colors"
          @click="editor.addLinePreset()"
        >
          + Add
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <PresetRow
          v-for="preset in editor.linePresets"
          :key="preset.id"
          :label="preset.label"
          :active="preset.id === editor.activeLinePresetId"
          :can-delete="editor.linePresets.length > 1"
          @select="editor.setActiveLinePreset(preset.id)"
          @duplicate="editor.duplicateLinePreset(preset.id)"
          @remove="editor.removeLinePreset(preset.id)"
          @rename="editor.renameLinePreset(preset.id, $event)"
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
        </PresetRow>
      </div>
    </div>

    <LineStyleControls />
  </div>
</template>
