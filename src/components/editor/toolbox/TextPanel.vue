<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
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
        <button
          v-for="preset in editor.textPresets"
          :key="preset.id"
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
          :class="preset.id === editor.activeTextPresetId
            ? 'bg-action-tint ring-1 ring-inset ring-action/30'
            : 'text-ink-text hover:bg-line/60'"
          @click="editor.setActiveTextPreset(preset.id)"
        >
          <span
            class="w-8 text-center shrink-0 text-sm leading-none"
            :style="{
              color: preset.style.color,
              fontWeight: preset.style.bold ? 'bold' : 'normal',
              fontSize: `${Math.min(preset.style.fontSize, 16)}px`,
            }"
          >{{ preset.content || '?' }}</span>
          <span
            class="text-sm truncate"
            :class="preset.id === editor.activeTextPresetId ? 'text-action font-medium' : ''"
          >{{ preset.label }}</span>
        </button>
      </div>
    </div>

    <TextStyleControls />
  </div>
</template>
