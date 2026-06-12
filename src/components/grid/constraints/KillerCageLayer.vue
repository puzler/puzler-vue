<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, keyToRowCol } from '@/composables/useGrid'
import { computeInsetOutlinePaths } from '@/utils/insetOutline'
import { CAGE_STYLE, colorToCss } from '@/types/constraintStyles'
import { GLOW_COLOR } from './connectorLayerShared'
import type { KillerCageData, CosmeticCageData } from '@/types/constraints'

const editor = useEditorStore()

// Just a hair of space between the cell borders and the dashed cage
// outline (box borders are 2.5 wide, so this clears them by ~2)
const CAGE_INSET = 3.5
const CAGE_COLOR = colorToCss(CAGE_STYLE.cageColor)
const TEXT_COLOR = colorToCss(CAGE_STYLE.textColor)
const SUM_FONT_SIZE = 13

// Constraint cages use the fixed CAGE_STYLE; cosmetic cages take their
// colors from the preset they were drawn with
function cosmeticCageColors(presetId: string): { cage: string; text: string } {
  const style = editor.cagePresets.find(p => p.id === presetId)?.style
  return { cage: style?.cageColor ?? CAGE_COLOR, text: style?.textColor ?? TEXT_COLOR }
}

function outlinePaths(cells: string[]): string[] {
  return computeInsetOutlinePaths(new Set(cells), { edgeInset: () => CAGE_INSET, cornerRadius: 2 })
}

// The sum sits in the top-left corner of the cage's top-left cell
function sumPosition(cells: string[]): { x: number; y: number } {
  const topLeft = cells
    .map(keyToRowCol)
    .sort((a, b) => a.row - b.row || a.col - b.col)[0]
  return {
    x: PADDING + topLeft.col * CELL_SIZE + CAGE_INSET + 1,
    y: PADDING + topLeft.row * CELL_SIZE + CAGE_INSET + 1,
  }
}

interface RenderedCage {
  id: string
  paths: string[]
  sum: number | null
  sumPos: { x: number; y: number }
  selected: boolean
  cageColor: string
  textColor: string
}

const cages = computed<RenderedCage[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'killer_cage' || i.type === 'cosmetic_cage')
    .map(i => {
      const data = i.data as KillerCageData
      const colors = i.type === 'cosmetic_cage'
        ? cosmeticCageColors((i.data as CosmeticCageData).presetId)
        : { cage: CAGE_COLOR, text: TEXT_COLOR }
      return {
        id: i.id,
        paths: outlinePaths(data.cells),
        sum: data.sum,
        sumPos: sumPosition(data.cells),
        selected: editor.selectedCageId === i.id,
        cageColor: colors.cage,
        textColor: colors.text,
      }
    }),
)

const pendingColor = computed(() =>
  editor.activeTool === 'cosmetic_cage'
    ? editor.activeCagePreset?.style.cageColor ?? CAGE_COLOR
    : CAGE_COLOR,
)

const pendingPaths = computed<string[]>(() =>
  (editor.activeTool === 'killer_cage' || editor.activeTool === 'cosmetic_cage') && editor.pendingCageCells.length > 0
    ? outlinePaths(editor.pendingCageCells)
    : [],
)
</script>

<template>
  <g pointer-events="none">
    <g
      v-for="cage in cages"
      :key="cage.id"
    >
      <template v-if="cage.selected">
        <path
          v-for="(p, i) in cage.paths"
          :key="`glow-${i}`"
          :d="p"
          fill="none"
          :stroke="GLOW_COLOR"
          stroke-width="4"
          stroke-opacity="0.45"
          stroke-linejoin="round"
        />
      </template>
      <path
        v-for="(p, i) in cage.paths"
        :key="i"
        :d="p"
        fill="none"
        :stroke="cage.cageColor"
        stroke-width="1.25"
        stroke-dasharray="5 3"
        stroke-linejoin="round"
      />
      <text
        v-if="cage.sum !== null"
        :x="cage.sumPos.x"
        :y="cage.sumPos.y"
        text-anchor="start"
        dominant-baseline="hanging"
        :fill="cage.textColor"
        :font-size="SUM_FONT_SIZE"
        font-weight="600"
        paint-order="stroke"
        stroke="white"
        stroke-width="3"
      >
        {{ cage.sum }}
      </text>
    </g>

    <path
      v-for="(p, i) in pendingPaths"
      :key="`pending-${i}`"
      :d="p"
      fill="none"
      :stroke="pendingColor"
      stroke-width="1.25"
      stroke-dasharray="5 3"
      stroke-opacity="0.5"
      stroke-linejoin="round"
    />
  </g>
</template>
