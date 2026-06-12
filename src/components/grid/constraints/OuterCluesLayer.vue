<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { TEXT_STYLES, colorToCss } from '@/types/constraintStyles'
import { OUTER_CLUE_TYPES, parseOuterKey, littleKillerStep } from '@/types/constraints'
import { GLOW_COLOR } from './connectorLayerShared'

const editor = useEditorStore()
const grid = useGridStore()

const SEPARATOR_COLOR = '#b8b3a8'
const SEPARATOR_INSET = 8

function outerCellCenter(row: number, col: number): { x: number; y: number } {
  return {
    x: PADDING + col * CELL_SIZE + CELL_SIZE / 2,
    y: PADDING + row * CELL_SIZE + CELL_SIZE / 2,
  }
}

interface RenderedClue {
  key: string
  x: number
  y: number
  text: string
  fontSize: number
  color: string
  selected: boolean
  arrowPath: string | null
}

// Little killer arrow: short diagonal with a chevron at the cell's inner
// corner, pointing into the grid; the value shifts slightly the other way
function littleKillerArrow(pos: { row: number; col: number }, direction: string): { path: string; offset: { dx: number; dy: number } } {
  const step = littleKillerStep(direction as Parameters<typeof littleKillerStep>[0])
  const ux = step.dCol / Math.SQRT2
  const uy = step.dRow / Math.SQRT2
  const cornerX = PADDING + pos.col * CELL_SIZE + (step.dCol > 0 ? CELL_SIZE : 0)
  const cornerY = PADDING + pos.row * CELL_SIZE + (step.dRow > 0 ? CELL_SIZE : 0)
  const tipX = cornerX - ux * 3
  const tipY = cornerY - uy * 3
  const baseX = tipX - ux * 14
  const baseY = tipY - uy * 14
  const wing = 4.5
  const px = -uy * wing
  const py = ux * wing
  const backX = tipX - ux * 6
  const backY = tipY - uy * 6
  const path = `M ${baseX} ${baseY} L ${tipX} ${tipY} M ${backX + px} ${backY + py} L ${tipX} ${tipY} L ${backX - px} ${backY - py}`
  return { path, offset: { dx: -ux * 9, dy: -uy * 9 } }
}

const clues = computed<RenderedClue[]>(() =>
  Object.entries(editor.outerClues).flatMap(([key, clue]) => {
    const pos = parseOuterKey(key)
    if (!pos) return []
    const style = TEXT_STYLES[clue.type]
    if (!style) return []
    const center = outerCellCenter(pos.row, pos.col)
    const arrow = clue.type === 'little_killers' && clue.direction
      ? littleKillerArrow(pos, clue.direction)
      : null
    return [{
      key,
      x: center.x + (arrow?.offset.dx ?? 0),
      y: center.y + (arrow?.offset.dy ?? 0),
      text: clue.value === null ? '_' : String(clue.value),
      fontSize: style.size * CELL_SIZE,
      color: colorToCss(style.fontColor),
      selected: editor.selectedOuterClueKey === key,
      arrowPath: arrow?.path ?? null,
    }]
  }),
)

// Light dotted separators between outer ring cells, shown while placing
const separators = computed<Array<{ x1: number; y1: number; x2: number; y2: number }>>(() => {
  if (!OUTER_CLUE_TYPES.has(editor.activeTool) || editor.mode !== 'setting') return []
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const top = PADDING - CELL_SIZE
  const bottom = PADDING + grid.rows * CELL_SIZE
  const left = PADDING - CELL_SIZE
  const right = PADDING + grid.cols * CELL_SIZE
  for (let c = 0; c <= grid.cols; c++) {
    const x = PADDING + c * CELL_SIZE
    segs.push({ x1: x, y1: top + SEPARATOR_INSET, x2: x, y2: top + CELL_SIZE - SEPARATOR_INSET })
    segs.push({ x1: x, y1: bottom + SEPARATOR_INSET, x2: x, y2: bottom + CELL_SIZE - SEPARATOR_INSET })
  }
  for (let r = 0; r <= grid.rows; r++) {
    const y = PADDING + r * CELL_SIZE
    segs.push({ x1: left + SEPARATOR_INSET, y1: y, x2: left + CELL_SIZE - SEPARATOR_INSET, y2: y })
    segs.push({ x1: right + SEPARATOR_INSET, y1: y, x2: right + CELL_SIZE - SEPARATOR_INSET, y2: y })
  }
  return segs
})
</script>

<template>
  <g pointer-events="none">
    <line
      v-for="(s, i) in separators"
      :key="`sep-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
      :stroke="SEPARATOR_COLOR"
      stroke-width="1"
      stroke-dasharray="2 3"
    />
    <g
      v-for="clue in clues"
      :key="clue.key"
    >
      <circle
        v-if="clue.selected"
        :cx="clue.x"
        :cy="clue.y"
        :r="clue.fontSize * 0.62"
        fill="none"
        :stroke="GLOW_COLOR"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <path
        v-if="clue.arrowPath"
        :d="clue.arrowPath"
        fill="none"
        :stroke="clue.color"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <text
        :x="clue.x"
        :y="clue.y"
        text-anchor="middle"
        dominant-baseline="central"
        :dy="clue.text === '_' ? '-0.3em' : undefined"
        :fill="clue.color"
        :font-size="clue.fontSize"
        font-weight="500"
      >
        {{ clue.text }}
      </text>
    </g>
  </g>
</template>
