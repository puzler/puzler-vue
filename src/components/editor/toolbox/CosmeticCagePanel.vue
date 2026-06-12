<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'
import NumpadPanel from '../NumpadPanel.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]

function onCageColorInput(event: Event) {
  editor.updateActiveCagePreset({ cageColor: (event.target as HTMLInputElement).value })
}

function onTextColorInput(event: Event) {
  editor.updateActiveCagePreset({ textColor: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-line">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
          Cages
        </p>
        <button
          class="text-[11px] text-action hover:text-action font-medium transition-colors"
          @click="editor.addCagePreset()"
        >
          + Add
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="preset in editor.cagePresets"
          :key="preset.id"
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
          :class="preset.id === editor.activeCagePresetId
            ? 'bg-action-tint text-action ring-1 ring-inset ring-action/30'
            : 'text-ink-text hover:bg-line/60'"
          @click="editor.setActiveCagePreset(preset.id)"
        >
          <svg
            width="32"
            height="18"
            viewBox="0 0 32 18"
            class="shrink-0"
          >
            <rect
              x="2"
              y="2"
              width="28"
              height="14"
              rx="2"
              fill="none"
              :stroke="preset.style.cageColor"
              stroke-width="1.5"
              stroke-dasharray="4 2"
            />
            <text
              x="6"
              y="13"
              :fill="preset.style.textColor"
              font-size="9"
              font-weight="600"
            >12</text>
          </svg>
          <span class="text-sm truncate">{{ preset.label }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="editor.activeCagePreset"
      class="flex flex-col gap-3 px-3 py-3"
    >
      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveConnectorMode"
        @select="editor.setConnectorMode($event as 'place' | 'select')"
      />
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
      <!-- 0 passes through: cage clues append digits with no maximum -->
      <NumpadPanel
        @digit="editor.placeDigitForSelection($event)"
        @delete="editor.placeDigitForSelection(null)"
      />
      <p class="text-[11px] text-faint leading-snug">
        Place: drag to draw a cage · click one to remove it · Select: click a cage to edit it (or hold Shift) · type digits for the clue
      </p>
    </div>
  </div>
</template>
