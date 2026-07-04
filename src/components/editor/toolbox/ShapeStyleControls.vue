<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import CosmeticPlacementControls from './CosmeticPlacementControls.vue'
import ShapeSizeControls from './ShapeSizeControls.vue'
import ShapeTextControls from './ShapeTextControls.vue'
import ShapeTypePicker from './ShapeTypePicker.vue'

const editor = useEditorStore()

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

function onRotationChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(raw)) editor.updateActiveShapePreset({ rotation: ((raw % 360) + 360) % 360 })
}

</script>

<template>
  <div
    v-if="editor.activeShapePreset"
    class="flex flex-col gap-3 px-3 py-3"
  >
    <CosmeticPlacementControls />

    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
      Style
    </p>

    <ShapeTypePicker />

    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Fill</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeShapePreset.style.fillColor === 'none' ? '#ffffff' : editor.activeShapePreset.style.fillColor"
          class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
          @input="onFillInput"
        >
        <button
          class="text-xs px-2 py-1 rounded border transition-colors"
          :class="editor.activeShapePreset.style.fillColor === 'none'
            ? 'border-action bg-action-tint text-action'
            : 'border-line text-soft hover:bg-line/40'"
          @click="editor.updateActiveShapePreset({ fillColor: 'none' })"
        >
          None
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Stroke</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          :value="editor.activeShapePreset.style.strokeColor"
          class="w-8 h-8 rounded cursor-pointer border border-line p-0.5"
          @input="onStrokeInput"
        >
        <span class="text-xs text-faint font-mono">{{ editor.activeShapePreset.style.strokeColor }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Stroke width</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="editor.activeShapePreset.style.strokeWidth"
          min="0"
          max="20"
          class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
          @change="onStrokeWidthChange"
        >
        <span class="text-xs text-faint">px</span>
      </div>
    </div>

    <ShapeSizeControls />

    <div class="flex flex-col gap-1">
      <label class="text-xs text-soft">Rotation</label>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="editor.activeShapePreset.style.rotation ?? 0"
          class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
          @change="onRotationChange"
        >
        <span class="text-xs text-faint">° on new shapes</span>
      </div>
    </div>

    <ShapeTextControls />
  </div>
</template>
