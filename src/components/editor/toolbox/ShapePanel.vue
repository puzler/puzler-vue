<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import PresetRow from './PresetRow.vue'
import ShapeStyleControls from './ShapeStyleControls.vue'

const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 pt-3 pb-2 border-b border-line">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
          Shapes
        </p>
        <button
          class="text-[11px] text-action hover:text-action font-medium transition-colors"
          @click="editor.addShapePreset()"
        >
          + Add
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <PresetRow
          v-for="preset in editor.shapePresets"
          :key="preset.id"
          :label="preset.label"
          :active="preset.id === editor.activeShapePresetId"
          :can-delete="editor.shapePresets.length > 1"
          @select="editor.setActiveShapePreset(preset.id)"
          @duplicate="editor.duplicateShapePreset(preset.id)"
          @remove="editor.removeShapePreset(preset.id)"
          @rename="editor.renameShapePreset(preset.id, $event)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            class="shrink-0"
          >
            <circle
              v-if="preset.style.shapeType === 'circle'"
              cx="10"
              cy="10"
              r="7"
              :fill="preset.style.fillColor"
              :stroke="preset.style.strokeColor"
              stroke-width="1.5"
            />
            <rect
              v-else-if="preset.style.shapeType === 'square'"
              x="3"
              y="3"
              width="14"
              height="14"
              :fill="preset.style.fillColor"
              :stroke="preset.style.strokeColor"
              stroke-width="1.5"
            />
            <polygon
              v-else-if="preset.style.shapeType === 'diamond'"
              points="10,2 18,10 10,18 2,10"
              :fill="preset.style.fillColor"
              :stroke="preset.style.strokeColor"
              stroke-width="1.5"
            />
          </svg>
        </PresetRow>
      </div>
    </div>

    <ShapeStyleControls />
  </div>
</template>
