<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

const editor = useEditorStore()

const MODES = [
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

      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveArrowDrawMode"
        @select="editor.setArrowDrawMode($event as 'bulb' | 'arrow')"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        Bulb: click or drag to place a bulb · tap a bulb or arrow to remove it
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Arrow: drag from a bulb or arrow to draw · drag from an arrow's tip to extend it · holding Shift switches to Arrow
      </p>
    </div>
  </div>
</template>
