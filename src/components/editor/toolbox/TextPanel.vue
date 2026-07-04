<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import PresetRow from './PresetRow.vue'
import TextStyleControls from './TextStyleControls.vue'

const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-line">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
          Text styles
        </p>
        <button
          class="text-[11px] text-action hover:text-action font-medium transition-colors"
          @click="editor.addTextPreset()"
        >
          + Add
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <PresetRow
          v-for="preset in editor.textPresets"
          :key="preset.id"
          :label="preset.label"
          :active="preset.id === editor.activeTextPresetId"
          :can-delete="editor.textPresets.length > 1"
          @select="editor.setActiveTextPreset(preset.id)"
          @duplicate="editor.duplicateTextPreset(preset.id)"
          @remove="editor.removeTextPreset(preset.id)"
          @rename="editor.renameTextPreset(preset.id, $event)"
        >
          <span
            class="w-8 text-center shrink-0 text-sm leading-none"
            :style="{
              color: preset.style.color,
              fontWeight: preset.style.bold ? 'bold' : 'normal',
              fontSize: `${Math.min(preset.style.fontSize, 16)}px`,
            }"
          >A</span>
        </PresetRow>
      </div>
    </div>

    <TextStyleControls />
  </div>
</template>
