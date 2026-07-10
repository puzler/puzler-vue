<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { LETTER_LABELS } from '@/utils/cellValues'
import SolverNumpadControls from './SolverNumpadControls.vue'
import NumpadModeKeys from './NumpadModeKeys.vue'
import NumpadBottomRow from './NumpadBottomRow.vue'
import NumpadExtraToolsBar from './NumpadExtraToolsBar.vue'
import NumpadExtraToolsRail from './NumpadExtraToolsRail.vue'
import NumpadColorBar from './NumpadColorBar.vue'

const editor = useEditorStore()
const grid = useGridStore()
const palette = useColorPaletteStore()

const isColor = computed(() => editor.effectiveInputMode === 'color')
const isLine = computed(() => editor.effectiveInputMode === 'line')
// Letter mode relabels the keys A-J only where letters can be placed.
const letterKeys = computed(() => editor.letterModeActive && !isColor.value && !isLine.value)

// Keys above the puzzle's digit range hide in digit/mark modes (the explicit
// DIGIT_POS grid keeps the remaining keys in place). Color, line, and letter
// modes use all nine keys as swatches/letters, so they stay.
function keyVisible(n: number): boolean {
  if (isColor.value || isLine.value || letterKeys.value) return true
  return n <= grid.effectiveDigitRange
}

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

// In color mode each numbered key becomes a swatch for the color at that index
// on the active page (0-9). Colours layer over a checkerboard so transparent/
// translucent slots read as transparent rather than solid white.
function swatchStyle(index: number): Record<string, string> {
  const key = palette.currentPageKeys[index]
  if (!key) return {}
  return { background: palette.swatchBackground(key) }
}

// Line mode swatches always come from palette PAGE 0 — the pen ignores the
// color bar's page navigation. Clicking picks the pen color (no grid input).
function lineSwatchStyle(index: number): Record<string, string> {
  const key = palette.palette.pages[0]?.[index]
  if (!key) return {}
  return { background: palette.swatchBackground(key) }
}

function onDigitKey(n: number) {
  if (isLine.value) editor.setPenColorIndex(n)
  else if (letterKeys.value) editor.placeLetterForSelection(LETTER_LABELS[n])
  else editor.placeDigitForSelection(n)
}
</script>

<template>
  <div class="flex h-full bg-paper">
    <div class="flex-1 min-w-0 flex flex-col gap-2 md:gap-3 overflow-y-auto p-2 md:p-4">
      <!-- Optional tools (line tool, future extras) in a fixed-thickness
           scrolling strip so the pad's geometry never changes as tools are
           enabled: an inset shelf up here on desktop, a full-height rail on
           the window's right edge on mobile. -->
      <NumpadExtraToolsBar />

      <div
        data-tour="numpad-digits"
        class="grid grid-cols-[repeat(3,minmax(0,1fr))_0.375rem_minmax(0,1fr)] gap-1.5 w-full max-w-[14rem] md:max-w-none mx-auto content-start"
      >
        <!-- Rows 1-3: digits 1-9 (swatches in color mode; pen-color pickers in
           line mode, with a ring on the selected color) -->
        <button
          v-for="n in 9"
          v-show="keyVisible(n)"
          :key="n"
          :class="[
            KEY,
            DIGIT_POS[n],
            isColor || isLine ? 'overflow-hidden' : '',
            isLine && n === editor.penColorIndex ? 'ring-2 ring-action ring-offset-1' : '',
          ]"
          :style="isColor ? swatchStyle(n) : isLine ? lineSwatchStyle(n) : undefined"
          @click="onDigitKey(n)"
        >
          <span
            v-if="isColor || isLine"
            class="absolute bottom-0.5 right-1 font-display text-[9px] font-semibold text-ink-text/50 leading-none"
          >{{ n }}</span>
          <span
            v-else
            :class="['transition-all duration-150', digitClass(n)]"
          >{{ letterKeys ? LETTER_LABELS[n] : n }}</span>
        </button>

        <!-- Mode buttons in the trailing column, rows 1-4 (+ line tool row 5) -->
        <!-- Transparent tour anchor spanning the four core mode buttons. -->
        <div
          data-tour="numpad-modes"
          class="col-start-5 row-start-1 row-end-5 pointer-events-none"
        />
        <NumpadModeKeys />

        <!-- Row 4: 0 + Delete (+ the letters toggle) or the pen target picker -->
        <NumpadBottomRow />
      </div>

      <!-- Color page navigation + palette editor, shown only in color mode -->
      <NumpadColorBar v-if="isColor" />

      <div class="w-full max-w-[14rem] md:max-w-none mx-auto">
        <SolverNumpadControls />
      </div>
    </div>

    <NumpadExtraToolsRail />
  </div>
</template>
