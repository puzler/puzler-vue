<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import CageStyleControls from './CageStyleControls.vue'
import ModeSwitcher from './ModeSwitcher.vue'
import NumpadPanel from '../NumpadPanel.vue'
import PresetRow from './PresetRow.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]
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
        <PresetRow
          v-for="preset in editor.cagePresets"
          :key="preset.id"
          :label="preset.label"
          :active="preset.id === editor.activeCagePresetId"
          :can-delete="editor.cagePresets.length > 1"
          @select="editor.setActiveCagePreset(preset.id)"
          @duplicate="editor.duplicateCagePreset(preset.id)"
          @remove="editor.removeCagePreset(preset.id)"
          @rename="editor.renameCagePreset(preset.id, $event)"
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
        </PresetRow>
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
      <CageStyleControls />
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
