<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { MAX_COSMETIC_TEXT_LEN } from '@/types/constraints'
import type { TextData, ShapeData } from '@/types/constraints'
import ModeSwitcher from './ModeSwitcher.vue'
import NudgeDpad from './NudgeDpad.vue'

// Shared Place/Select + external-space + per-object editing controls for the
// movable cosmetics (text and shape). The active tool's panel mounts this; the
// selected object can be either kind, so it reads from selectedCosmetic.
const editor = useEditorStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]

const selectedContent = computed(() => {
  const inst = editor.selectedCosmetic
  if (!inst) return ''
  return (inst.data as TextData | ShapeData).content ?? ''
})

function onContentInput(event: Event) {
  const inst = editor.selectedCosmetic
  if (!inst) return
  editor.updateCosmeticContent(inst.id, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <ModeSwitcher
      :modes="MODES"
      :active="editor.effectiveConnectorMode"
      @select="editor.setConnectorMode($event as 'place' | 'select')"
    />

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        class="accent-action w-3.5 h-3.5 cursor-pointer"
        :checked="editor.showExternalSpace"
        @change="editor.setShowExternalSpace(($event.target as HTMLInputElement).checked)"
      >
      <span class="text-xs text-soft">Show external space</span>
    </label>

    <div
      v-if="editor.selectedCosmetic"
      class="flex flex-col gap-2"
    >
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-soft">Text</label>
        <input
          :value="selectedContent"
          :maxlength="MAX_COSMETIC_TEXT_LEN"
          placeholder="(empty)"
          class="w-full text-sm px-2 py-1.5 rounded border border-line focus:outline-none focus:border-action text-center"
          @input="onContentInput"
        >
      </div>
      <NudgeDpad />
    </div>
    <p
      v-else
      class="text-[11px] text-faint leading-snug"
    >
      Place: click to add at the nearest point (centre, edge or corner) · click again to remove · Select: click an object (or hold Shift) to edit its text and nudge it
    </p>
  </div>
</template>
