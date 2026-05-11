<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import type { ShapeType } from '@/types/constraints'

const editor = useEditorStore()

function setShapeType(type: ShapeType) {
  editor.updateActiveShapePreset({ shapeType: type })
}

function onFillInput(event: Event) {
  editor.updateActiveShapePreset({ fillColor: (event.target as HTMLInputElement).value })
}

function onStrokeInput(event: Event) {
  editor.updateActiveShapePreset({ strokeColor: (event.target as HTMLInputElement).value })
}

function onStrokeWidthChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveShapePreset({ strokeWidth: Math.max(0, Math.min(20, raw)) })
}

function onSizeChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveShapePreset({ size: Math.max(0.1, Math.min(0.9, raw / 100)) })
}
</script>

<template>
  <div
    v-if="editor.activeShapePreset"
    class="flex flex-col gap-3 px-3 py-3"
  >
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-gray-500">Shape</label>
      <div class="flex gap-1.5">
        <button
          v-for="type in (['circle', 'square', 'diamond'] as ShapeType[])"
          :key="type"
          class="flex-1 py-1.5 rounded border text-xs transition-colors capitalize"
          :class="editor.activeShapePreset.style.shapeType === type
            ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="setShapeType(type)"
        >
          {{ type }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">Fill</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeShapePreset.style.fillColor === 'none' ? '#ffffff' : editor.activeShapePreset.style.fillColor"
          class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
          @input="onFillInput"
        >
        <button
          class="text-xs px-2 py-1 rounded border transition-colors"
          :class="editor.activeShapePreset.style.fillColor === 'none'
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
          @click="editor.updateActiveShapePreset({ fillColor: 'none' })"
        >
          None
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">Stroke</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeShapePreset.style.strokeColor"
          class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
          @input="onStrokeInput"
        >
        <span class="text-xs text-gray-400 font-mono">{{ editor.activeShapePreset.style.strokeColor }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">Stroke width</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="editor.activeShapePreset.style.strokeWidth"
          min="0"
          max="20"
          class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
          @change="onStrokeWidthChange"
        >
        <span class="text-xs text-gray-400">px</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">Size</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="Math.round(editor.activeShapePreset.style.size * 100)"
          min="10"
          max="90"
          class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
          @change="onSizeChange"
        >
        <span class="text-xs text-gray-400">%</span>
      </div>
    </div>
    <p class="text-[11px] text-gray-400 leading-snug">
      Click a cell to place at the nearest anchor · click again to remove
    </p>
  </div>
</template>
