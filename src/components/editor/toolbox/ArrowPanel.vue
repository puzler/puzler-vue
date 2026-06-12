<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

const MODES: Array<{ key: 'bulb' | 'arrow'; label: string }> = [
  { key: 'bulb', label: 'Bulb' },
  { key: 'arrow', label: 'Arrow' },
]
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Arrows
      </p>

      <div class="grid grid-cols-2 gap-1 p-1 rounded-lg bg-line/40">
        <button
          v-for="mode in MODES"
          :key="mode.key"
          class="py-1.5 rounded-md text-sm font-medium transition-colors"
          :class="editor.effectiveArrowDrawMode === mode.key
            ? 'bg-surface text-action shadow-sm'
            : 'text-soft hover:text-ink-text'"
          @click="editor.setArrowDrawMode(mode.key)"
        >
          {{ mode.label }}
        </button>
      </div>

      <p class="text-[11px] text-soft leading-snug text-center">
        Bulb: click or drag to place a bulb · tap a bulb or arrow to remove it
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Arrow: drag from a bulb or arrow to draw · holding Shift switches to Arrow
      </p>
    </div>
  </div>
</template>
