<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'
import NumpadPanel from '../NumpadPanel.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]

const isRatio = computed(() => editor.activeTool === 'ratio_dots')
const title = computed(() => isRatio.value ? 'Ratio Dots' : 'Difference Dots')
const defaultHint = computed(() => isRatio.value
  ? 'Without a value, a dot marks a 2:1 ratio'
  : 'Without a value, a dot marks a difference of 1')
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        {{ title }}
      </p>

      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveConnectorMode"
        @select="editor.setConnectorMode($event as 'place' | 'select')"
      />

      <NumpadPanel
        @digit="editor.placeDigitForSelection($event || null)"
        @delete="editor.placeDigitForSelection(null)"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        Place: click a cell border to add or remove a dot · Select: click a dot to edit it (or hold Shift)
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Type a digit to set the selected dot's value · {{ defaultHint }}
      </p>
    </div>
  </div>
</template>
