<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'
import NumpadPanel from '../NumpadPanel.vue'
import FogSolverHelpersSection from './FogSolverHelpersSection.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]

// The editor only draws connected cages, so connectivity is assumed by the fog
// solver; this opt-out is for JSON-authored disconnected cages.
const HELPER_OPTIONS = [
  { key: 'cagesMaybeDisconnected' as const, label: "Don't assume cage cells are connected" },
]
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Killer Cages
      </p>

      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveConnectorMode"
        @select="editor.setConnectorMode($event as 'place' | 'select')"
      />

      <!-- 0 passes through: cage sums append digits, so 10/20/100 are typable -->
      <NumpadPanel
        @digit="editor.placeDigitForSelection($event)"
        @delete="editor.placeDigitForSelection(null)"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        Place: drag to draw a cage · click a cage to remove it · Select: click a cage to edit it (or hold Shift)
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Type digits to build the sum · Backspace removes the last digit · cages without a sum are allowed
      </p>

      <FogSolverHelpersSection :options="HELPER_OPTIONS" />
    </div>
  </div>
</template>
