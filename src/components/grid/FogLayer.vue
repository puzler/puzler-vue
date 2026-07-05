<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, cellKey, keyToRowCol } from '@/composables/useGrid'
import { mdiLightbulbOnOutline } from '@mdi/js'

// Module-level sequence for per-instance SVG filter ids.
let fogSoftSeq = 0

// Fog of War overlay. Two render positions in SudokuGrid share this component:
// - faint (setting mode): a light tint over every non-light cell, drawn above
//   all content so the setter sees the fog coverage without losing the grid,
//   plus a bulb glyph marking each light.
// - opaque (solving mode + static renders): full-strength cover over the
//   currently fogged cells, drawn below solver entries, selection and grid
//   lines but above givens, constraint graphics and cosmetics.
const props = defineProps<{
  variant: 'faint' | 'opaque'
  // Opaque instance only: also emit a luminance mask of the fog under this id;
  // SudokuGrid applies it to the constraint/cosmetic layers. The mask uses the
  // SAME feathered fog shape (in black over white), so their graphics fade out
  // exactly as the fog fades in — as if drawn underneath the fog — instead of
  // cutting off hard at the cell boundary.
  maskId?: string
}>()

const grid = useGridStore()
const editor = useEditorStore()

// Soft fog edge: the rects render as one group, get dilated then blurred, and
// the sharp source merges back on top. Fogged cells stay fully covered while
// the fog feathers outward into revealed cells, SudokuPad-style. The filtered
// result is then clipped to the grid bounds so the puzzle's outer edge stays
// clean (clip-path applies after the filter). Per-instance ids — several
// grids can be mounted at once.
const softId = `fog-soft-${++fogSoftSeq}`
const boundsId = `${softId}-bounds`
const FEATHER = 6

interface Rect { x: number; y: number }

function rectFor(key: string): Rect {
  const { row, col } = keyToRowCol(key)
  return { x: PADDING + col * CELL_SIZE, y: PADDING + row * CELL_SIZE }
}

// faint = the initial fog state (all cells minus lights); opaque = the live
// derived fog set.
const fogRects = computed<Rect[]>(() => {
  if (props.variant === 'opaque') {
    return Array.from(editor.foggedCells, rectFor)
  }
  const lights = editor.fogLightCells
  const out: Rect[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (!lights.has(cellKey(r, c))) out.push({ x: PADDING + c * CELL_SIZE, y: PADDING + r * CELL_SIZE })
    }
  }
  return out
})

// White base for the mask, comfortably covering the viewBox (outer clues and
// outside-the-grid cosmetics stay fully visible).
const FAR = 100000
const gridW = computed(() => grid.cols * CELL_SIZE)
const gridH = computed(() => grid.rows * CELL_SIZE)

// Bulb glyphs on light cells: a setter aid, shown only while the fog panel's
// tools are active so the markers don't clutter the grid for other tools.
const GLYPH_SIZE = 24 // mdi viewbox
const glyphScale = (CELL_SIZE * 0.4) / GLYPH_SIZE
const lightGlyphs = computed(() => {
  if (props.variant !== 'faint') return []
  if (editor.activeTool !== 'fog' && editor.activeTool !== 'fog_lights') return []
  return Array.from(editor.fogLightCells, (key) => {
    const { x, y } = rectFor(key)
    const offset = (CELL_SIZE - GLYPH_SIZE * glyphScale) / 2
    return { key, transform: `translate(${x + offset}, ${y + offset}) scale(${glyphScale})` }
  })
})
</script>

<template>
  <g pointer-events="none">
    <filter :id="softId">
      <feMorphology
        in="SourceGraphic"
        operator="dilate"
        :radius="FEATHER"
        result="dilated"
      />
      <feGaussianBlur
        in="dilated"
        :stdDeviation="FEATHER"
        result="halo"
      />
      <feMerge>
        <feMergeNode in="halo" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <clipPath :id="boundsId">
      <rect
        :x="PADDING"
        :y="PADDING"
        :width="gridW"
        :height="gridH"
      />
    </clipPath>

    <!-- Luminance mask for the layers that sit "under" the fog: white
         everywhere, minus the identical feathered fog shape in black. A
         graphic's visibility is exactly the complement of the fog's cover. -->
    <mask v-if="maskId" :id="maskId">
      <rect
        :x="-FAR"
        :y="-FAR"
        :width="FAR * 2"
        :height="FAR * 2"
        fill="white"
      />
      <g
        :filter="`url(#${softId})`"
        :clip-path="`url(#${boundsId})`"
      >
        <rect
          v-for="(fr, i) in fogRects"
          :key="`mask-${i}`"
          :x="fr.x"
          :y="fr.y"
          :width="CELL_SIZE"
          :height="CELL_SIZE"
          fill="black"
        />
      </g>
    </mask>

    <!-- Opacity sits on the group (not the rects) so the dilated, overlapping
         rects composite as one flat shape instead of stacking at cell seams. -->
    <g
      :filter="`url(#${softId})`"
      :clip-path="`url(#${boundsId})`"
      :opacity="variant === 'faint' ? 0.25 : 1"
    >
      <rect
        v-for="(fr, i) in fogRects"
        :key="`fog-${i}`"
        :x="fr.x"
        :y="fr.y"
        :width="CELL_SIZE"
        :height="CELL_SIZE"
        class="grid-fog"
      />
    </g>

    <path
      v-for="g in lightGlyphs"
      :key="`light-${g.key}`"
      :d="mdiLightbulbOnOutline"
      :transform="g.transform"
      class="fog-light-glyph"
      opacity="0.85"
    />
  </g>
</template>

<style scoped>
.grid-fog { fill: var(--color-grid-fog); }
.fog-light-glyph { fill: var(--color-spark); }
</style>
