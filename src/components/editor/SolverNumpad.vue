<script setup lang="ts">
import { computed } from 'vue'
import { mdiPalette } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'
import { useColorPaletteStore } from '@/stores/colorPalette'
import MdiIcon from '@/components/MdiIcon.vue'
import SolverNumpadControls from './SolverNumpadControls.vue'
import NumpadColorBar from './NumpadColorBar.vue'

const editor = useEditorStore()
const palette = useColorPaletteStore()

const isColor = computed(() => editor.effectiveInputMode === 'color')

const KEY = 'relative flex p-1 aspect-square rounded-lg bg-surface border border-line text-ink-text font-display font-semibold shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors'

// Explicit grid placement so the digit cluster (cols 1-3) stays put regardless
// of the trailing spacer + mode column. Literal classes keep Tailwind happy.
const DIGIT_POS: Record<number, string> = {
  1: 'col-start-1 row-start-1', 2: 'col-start-2 row-start-1', 3: 'col-start-3 row-start-1',
  4: 'col-start-1 row-start-2', 5: 'col-start-2 row-start-2', 6: 'col-start-3 row-start-2',
  7: 'col-start-1 row-start-3', 8: 'col-start-2 row-start-3', 9: 'col-start-3 row-start-3',
}

// In corner mode, each digit sits where it would as a corner pencil-mark — the
// digit's own slot in a 3×3 (1 top-left … 9 bottom-right). Auto margins push the
// single flex child into that slot.
const CORNER_POS: Record<number, string> = {
  1: 'mr-auto mb-auto', 2: 'mx-auto mb-auto', 3: 'ml-auto mb-auto',
  4: 'mr-auto my-auto', 5: 'm-auto', 6: 'ml-auto my-auto',
  7: 'mr-auto mt-auto', 8: 'mx-auto mt-auto', 9: 'ml-auto mt-auto',
}

// Make the numbers "match" the active input mode: big and centred for full
// digits, small and centred for centre marks, small and corner-positioned for
// corner marks. (Color mode swaps the number for a swatch entirely.)
function digitClass(n: number): string {
  const mode = editor.effectiveInputMode
  if (mode === 'center') return 'm-auto text-base leading-none'
  if (mode === 'corner') return `${CORNER_POS[n] ?? 'm-auto'} text-base leading-none`
  return 'm-auto text-4xl leading-none'
}

// Mode keys share the digit keys' grid (equal 1fr columns = identical size)
// but sit past a thin spacer column, so proximity separates the two clusters.
const MODE_KEY = 'col-start-5 relative aspect-square rounded-lg border shadow-sm flex items-center justify-center transition-colors'

function modeClass(key: 'digit' | 'center' | 'corner' | 'color'): string {
  return editor.effectiveInputMode === key
    ? 'bg-action border-action text-white'
    : 'bg-surface border-line text-soft hover:border-action hover:text-action'
}

// In color mode each numbered key becomes a swatch for the color at that index
// on the active page (0-9). Colours layer over a checkerboard so transparent/
// translucent slots read as transparent rather than solid white.
function swatchStyle(index: number): Record<string, string> {
  const key = palette.currentPageKeys[index]
  if (!key) return {}
  return { background: palette.swatchBackground(key) }
}
</script>

<template>
  <div class="flex flex-col gap-2 md:gap-3 bg-paper overflow-y-auto h-full p-2 md:p-4">
    <div
      data-tour="numpad-digits"
      class="grid grid-cols-[repeat(3,minmax(0,1fr))_0.375rem_minmax(0,1fr)] gap-1.5 w-full max-w-[14rem] md:max-w-none mx-auto content-start"
    >
      <!-- Rows 1-3: digits 1-9 (swatches in color mode) -->
      <button
        v-for="n in 9"
        :key="n"
        :class="[KEY, DIGIT_POS[n], isColor ? 'overflow-hidden' : '']"
        :style="isColor ? swatchStyle(n) : undefined"
        @click="editor.placeDigitForSelection(n)"
      >
        <span
          v-if="isColor"
          class="absolute bottom-0.5 right-1 font-display text-[9px] font-semibold text-ink-text/50 leading-none"
        >{{ n }}</span>
        <span
          v-else
          :class="['transition-all duration-150', digitClass(n)]"
        >{{ n }}</span>
      </button>

      <!-- Mode buttons in the trailing column, rows 1-4 -->
      <!-- Transparent tour anchor spanning all four mode buttons (col 5, rows 1-4). -->
      <div
        data-tour="numpad-modes"
        class="col-start-5 row-start-1 row-end-5 pointer-events-none"
      />
      <button
        title="Full digits (Z)"
        aria-label="Full digits"
        :class="[MODE_KEY, 'row-start-1', modeClass('digit')]"
        @click="editor.setInputMode('digit')"
      >
        <span class="font-display text-4xl font-semibold leading-none">1</span>
      </button>
      <button
        title="Corner marks (X)"
        aria-label="Corner marks"
        :class="[MODE_KEY, 'row-start-2', modeClass('corner')]"
        @click="editor.setInputMode('corner')"
      >
        <span class="absolute top-1 left-1.5 font-display text-[10px] font-semibold leading-none">1</span>
        <span class="absolute top-1 right-1.5 font-display text-[10px] font-semibold leading-none">2</span>
        <span class="absolute bottom-1 left-1.5 font-display text-[10px] font-semibold leading-none">3</span>
        <span class="absolute bottom-1 right-1.5 font-display text-[10px] font-semibold leading-none">4</span>
      </button>
      <button
        title="Center marks (C)"
        aria-label="Center marks"
        :class="[MODE_KEY, 'row-start-3', modeClass('center')]"
        @click="editor.setInputMode('center')"
      >
        <span class="font-display text-[10px] font-semibold leading-none tracking-tight">123</span>
      </button>
      <button
        title="Colors (V)"
        aria-label="Colors"
        :class="[MODE_KEY, 'row-start-4', modeClass('color')]"
        @click="editor.setInputMode('color')"
      >
        <MdiIcon
          :path="mdiPalette"
          :size="18"
        />
      </button>

      <!-- Row 4: 0 + Delete -->
      <button
        :class="[KEY, 'col-start-1 row-start-4', isColor ? 'overflow-hidden' : '']"
        :style="isColor ? swatchStyle(0) : undefined"
        @click="editor.placeDigitForSelection(0)"
      >
        <span
          v-if="isColor"
          class="absolute bottom-0.5 right-1 font-display text-[9px] font-semibold text-ink-text/50 leading-none"
        >0</span>
        <span
          v-else
          :class="['transition-all duration-150', digitClass(0)]"
        >0</span>
      </button>
      <button
        class="col-start-2 col-span-2 row-start-4 h-full rounded-lg bg-surface border border-line text-soft text-sm font-medium shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:bg-red-100 transition-colors"
        @click="editor.placeDigitForSelection(null)"
      >
        Delete
      </button>
    </div>

    <!-- Color page navigation + palette editor, shown only in color mode -->
    <NumpadColorBar v-if="isColor" />

    <div class="w-full max-w-[14rem] md:max-w-none mx-auto">
      <SolverNumpadControls />
    </div>
  </div>
</template>
