<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import OpacityField from './OpacityField.vue'

// Color + opacity rows for the active cosmetic cage preset (outline and clue).
const editor = useEditorStore()

function onCageColorInput(event: Event) {
  editor.updateActiveCagePreset({ cageColor: (event.target as HTMLInputElement).value })
}

function onTextColorInput(event: Event) {
  editor.updateActiveCagePreset({ textColor: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <template v-if="editor.activeCagePreset">
    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Cage color</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeCagePreset.style.cageColor"
          class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
          @input="onCageColorInput"
        >
        <span class="text-xs text-faint font-mono">{{ editor.activeCagePreset.style.cageColor }}</span>
      </div>
    </div>
    <OpacityField
      label="Cage opacity"
      :value="editor.activeCagePreset.style.cageOpacity"
      @change="editor.updateActiveCagePreset({ cageOpacity: $event })"
    />
    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Clue color</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeCagePreset.style.textColor"
          class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
          @input="onTextColorInput"
        >
        <span class="text-xs text-faint font-mono">{{ editor.activeCagePreset.style.textColor }}</span>
      </div>
    </div>
    <OpacityField
      label="Clue opacity"
      :value="editor.activeCagePreset.style.textOpacity"
      @change="editor.updateActiveCagePreset({ textOpacity: $event })"
    />
  </template>
</template>
