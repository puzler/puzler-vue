<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { enabledExtraModes, extraToolClass, centerToolInStrip } from './numpadModes'
import MdiIcon from '@/components/MdiIcon.vue'

// Mobile optional-tools rail: an inset column locked to the right edge of the
// bottom control window, spanning its full height (the mirror of the layouts'
// left icon rail). The window constrains HEIGHT, so overflow scrolls
// vertically — the rail never grows extra columns. Desktop uses
// NumpadExtraToolsBar instead. Renders nothing when no extra tool is enabled.

const editor = useEditorStore()
const player = usePlayerSettingsStore()

const extraModes = computed(() => enabledExtraModes(player.settings))

const rail = ref<HTMLElement | null>(null)

// Cycling with B centers the active tool in the rail, mirroring the bar.
watch(() => editor.inputMode, (mode) => {
  const idx = extraModes.value.findIndex((m) => m.mode === mode)
  if (idx === -1 || !rail.value) return
  const btn = rail.value.querySelectorAll('button')[idx]
  if (btn) centerToolInStrip(rail.value, btn, 'y')
})
</script>

<template>
  <div
    v-if="extraModes.length"
    ref="rail"
    class="md:hidden shrink-0 w-12 py-3 px-1.5 bg-canvas border-l border-line flex flex-col items-center gap-2 overflow-y-auto no-scrollbar inset-shadow-l"
  >
    <button
      v-for="m in extraModes"
      :key="m.mode"
      :title="m.title"
      :aria-label="m.label"
      :class="['shrink-0 w-9 h-9 rounded-lg border shadow-sm flex items-center justify-center transition-colors', extraToolClass(editor.effectiveInputMode === m.mode)]"
      @click="editor.setInputMode(m.mode)"
    >
      <MdiIcon
        :path="m.icon"
        :size="18"
      />
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
/* Recessed shading against the numpad edge only (top/bottom stay open where
   the rail scrolls). Fixed to the box, so content scrolls under it. */
.inset-shadow-l {
  box-shadow: inset 3px 0 4px -2px rgb(0 0 0 / 0.12);
}
</style>
