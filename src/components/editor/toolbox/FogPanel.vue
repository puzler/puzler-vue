<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

// Shared panel for the fog global ('fog') and its light-placement tool
// ('fog_lights'): the mode switcher flips between them.
const editor = useEditorStore()

const MODES = [
  { key: 'fog', label: 'Fog' },
  { key: 'fog_lights', label: 'Lights' },
]
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Fog of War
      </p>

      <p class="text-[11px] text-soft leading-snug text-center">
        The grid starts covered in fog. Placing a correct digit clears the fog in that cell and its neighbors.
      </p>

      <label class="flex items-center gap-2.5 cursor-pointer justify-center">
        <input
          type="checkbox"
          class="accent-action w-3.5 h-3.5 cursor-pointer"
          :checked="editor.fogEnabled"
          @change="editor.toggleGlobalVariant('fog')"
        >
        <span class="text-sm text-ink-text">Enable fog</span>
      </label>

      <ModeSwitcher
        :modes="MODES"
        :active="editor.activeTool"
        @select="editor.setActiveTool($event)"
      />

      <p
        v-if="editor.activeTool === 'fog_lights'"
        class="text-[11px] text-soft leading-snug text-center"
      >
        Click a cell to toggle a light · lights stay fog free from the start
      </p>
      <p
        v-else
        class="text-[11px] text-soft leading-snug text-center"
      >
        While setting, any placed digit clears fog when test solving. Published puzzles only clear fog for correct digits.
      </p>
    </div>
  </div>
</template>
