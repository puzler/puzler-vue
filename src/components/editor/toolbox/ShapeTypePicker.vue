<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import type { ShapeType } from '@/types/constraints'

// Circle/square/diamond selector for the active shape preset. Glyph buttons:
// the toolbox column is too narrow for the type names as text.
const editor = useEditorStore()

const TYPES: ShapeType[] = ['circle', 'square', 'diamond']

function setShapeType(type: ShapeType) {
  editor.updateActiveShapePreset({ shapeType: type })
}
</script>

<template>
  <div
    v-if="editor.activeShapePreset"
    class="flex flex-col gap-1.5"
  >
    <label class="text-xs text-soft">Shape</label>
    <div class="flex gap-1.5">
      <button
        v-for="type in TYPES"
        :key="type"
        class="flex-1 min-w-0 py-1.5 flex items-center justify-center rounded border transition-colors"
        :class="editor.activeShapePreset.style.shapeType === type
          ? 'border-action bg-action-tint text-action'
          : 'border-line text-soft hover:bg-line/40'"
        :title="type.charAt(0).toUpperCase() + type.slice(1)"
        :aria-label="type"
        @click="setShapeType(type)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
        >
          <circle
            v-if="type === 'circle'"
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <rect
            v-else-if="type === 'square'"
            x="3"
            y="3"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <polygon
            v-else
            points="10,2 18,10 10,18 2,10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
