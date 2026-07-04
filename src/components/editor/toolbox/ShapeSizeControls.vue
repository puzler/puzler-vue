<script setup lang="ts">
import { mdiLinkVariant, mdiLinkVariantOff } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'

// Width/height inputs for the active shape preset, with a link toggle that
// mirrors edits between them. Only the lower bound is clamped: setters are
// trusted with shapes of any size, including ones spanning many cells.
const editor = useEditorStore()

function onDimensionChange(dimension: 'width' | 'height', event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  const value = Math.max(0.01, raw / 100)
  editor.updateActiveShapePreset(
    editor.activeShapePreset?.style.sizeLinked
      ? { width: value, height: value }
      : { [dimension]: value },
  )
}

function toggleSizeLinked() {
  const style = editor.activeShapePreset?.style
  if (!style) return
  editor.updateActiveShapePreset(
    // Re-linking snaps height to width so the inputs agree with the toggle.
    style.sizeLinked ? { sizeLinked: false } : { sizeLinked: true, height: style.width },
  )
}
</script>

<template>
  <div
    v-if="editor.activeShapePreset"
    class="flex flex-col gap-1"
  >
    <div class="flex items-center justify-between">
      <label class="text-xs text-soft">Size</label>
      <button
        class="p-1 rounded border transition-colors"
        :class="editor.activeShapePreset.style.sizeLinked
          ? 'border-action bg-action-tint text-action'
          : 'border-line text-soft hover:bg-line/40'"
        :title="editor.activeShapePreset.style.sizeLinked ? 'Unlink width and height' : 'Link width and height'"
        @click="toggleSizeLinked"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
        >
          <path
            :d="editor.activeShapePreset.style.sizeLinked ? mdiLinkVariant : mdiLinkVariantOff"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 text-[10px] text-faint">W</span>
      <input
        type="number"
        :value="Math.round(editor.activeShapePreset.style.width * 100)"
        min="1"
        class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
        @change="onDimensionChange('width', $event)"
      >
      <span class="text-xs text-faint">%</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 text-[10px] text-faint">H</span>
      <input
        type="number"
        :value="Math.round(editor.activeShapePreset.style.height * 100)"
        min="1"
        class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
        @change="onDimensionChange('height', $event)"
      >
      <span class="text-xs text-faint">%</span>
    </div>
  </div>
</template>
