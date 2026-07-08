<script setup lang="ts">
import { computed } from 'vue'
import { mdiBackspaceOutline } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { LETTER_LABELS } from '@/utils/cellValues'
import MdiIcon from '@/components/MdiIcon.vue'
import NumpadLetterToggle from './NumpadLetterToggle.vue'
import type { PenTarget } from '@/types/grid'

// Row 4 of the solver numpad: the 0 key and Delete — plus the Letter tool's
// numbers/letters toggle when enabled (it sits between them, and Delete
// shrinks to an icon-only key) — or the pen's target picker while the line
// tool is active. A multi-root fragment on purpose: every element here is an
// item of the numpad's CSS grid.

const editor = useEditorStore()
const palette = useColorPaletteStore()
const player = usePlayerSettingsStore()

const isColor = computed(() => editor.effectiveInputMode === 'color')
const isLine = computed(() => editor.effectiveInputMode === 'line')
// Letters render on the keys only where they can be placed (digit/mark modes).
const letterKeys = computed(() => editor.letterModeActive && !isColor.value && !isLine.value)
const showLetterToggle = computed(
  () => player.settings.enableLetterTool && !isColor.value && !isLine.value,
)

const PEN_TARGETS: { value: PenTarget; label: string }[] = [
  { value: 'centers', label: 'Centers' },
  { value: 'edges', label: 'Edges' },
  { value: 'both', label: 'Centers & Edges' },
]

const KEY = 'relative flex p-1 aspect-square rounded-lg bg-surface border border-line text-ink-text font-display font-semibold shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors'

const zeroClass = computed(() =>
  editor.effectiveInputMode === 'digit' ? 'm-auto text-4xl leading-none' : 'm-auto text-base leading-none',
)

// Literal class strings for both Delete layouts (Tailwind purge). With the
// toggle shown, Delete moves right and shrinks to an icon-only key.
const deleteClass = computed(() =>
  showLetterToggle.value
    ? 'col-start-3 row-start-4 h-full rounded-lg bg-surface border border-line text-soft text-sm font-medium shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:bg-red-100 transition-colors flex items-center justify-center'
    : 'col-start-2 col-span-2 row-start-4 h-full rounded-lg bg-surface border border-line text-soft text-sm font-medium shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:bg-red-100 transition-colors',
)

function onZeroKey() {
  if (letterKeys.value) editor.placeLetterForSelection(LETTER_LABELS[0])
  else editor.placeDigitForSelection(0)
}

// Color mode: the 0 key is the swatch for the active page's first color.
function zeroSwatchStyle(): Record<string, string> {
  const key = palette.currentPageKeys[0]
  if (!key) return {}
  return { background: palette.swatchBackground(key) }
}
</script>

<template>
  <select
    v-if="isLine"
    v-model="editor.penTarget"
    aria-label="Line tool target"
    class="col-start-1 col-span-3 row-start-4 h-full rounded-lg bg-surface border border-line text-soft text-sm font-medium shadow-sm px-2 hover:border-action transition-colors"
  >
    <option
      v-for="t in PEN_TARGETS"
      :key="t.value"
      :value="t.value"
    >
      {{ t.label }}
    </option>
  </select>
  <template v-else>
    <button
      :class="[KEY, 'col-start-1 row-start-4', isColor ? 'overflow-hidden' : '']"
      :style="isColor ? zeroSwatchStyle() : undefined"
      @click="onZeroKey"
    >
      <span
        v-if="isColor"
        class="absolute bottom-0.5 right-1 font-display text-[9px] font-semibold text-ink-text/50 leading-none"
      >0</span>
      <span
        v-else
        :class="['transition-all duration-150', zeroClass]"
      >{{ letterKeys ? LETTER_LABELS[0] : 0 }}</span>
    </button>
    <NumpadLetterToggle v-if="showLetterToggle" />
    <button
      :class="deleteClass"
      aria-label="Delete"
      @click="editor.placeDigitForSelection(null)"
    >
      <MdiIcon
        v-if="showLetterToggle"
        :path="mdiBackspaceOutline"
        :size="18"
      />
      <template v-else>
        Delete
      </template>
    </button>
  </template>
</template>
