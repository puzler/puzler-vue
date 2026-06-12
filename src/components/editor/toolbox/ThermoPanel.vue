<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'draw', label: 'Draw' },
  { key: 'branch', label: 'Branch' },
]
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Thermometers
      </p>

      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveThermoDrawMode"
        @select="editor.setThermoDrawMode($event as 'draw' | 'branch')"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        Digits strictly increase from the bulb toward each tip
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Draw: drag to place a thermometer · click one to remove it
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Branch: drag from a thermo cell to branch · tap a cell to remove its branch · holding Shift switches to Branch
      </p>
    </div>
  </div>
</template>
