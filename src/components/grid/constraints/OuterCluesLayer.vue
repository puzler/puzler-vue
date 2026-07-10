<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { OUTER_CLUE_TYPES, OUTER_RUN_STEP, parseOuterKey, littleKillerStep, outerClueDirections } from '@/types/constraints'
import type { OuterClueRunDirection } from '@/types/constraints'
import { cellKey, keyToRowCol } from '@/composables/useGrid'
import { useConstraintStyles } from '@/composables/useConstraintStyles'
import { GLOW_COLOR } from './connectorLayerShared'

const editor = useEditorStore()
const grid = useGridStore()
const cs = useConstraintStyles()

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
  arrowColor: string
  selected: boolean
  arrowPath: string | null
  // Multi-run clues: one toggleable arrow per readable run. Disabled runs
  // render ghosted while the clue's own tool is active (so they're clickable),
  // and not at all otherwise — solvers see exactly what the clue binds.
  runArrows: Array<{ key: string; d: string; opacity: number }>
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

function isLive(r: number, c: number): boolean {
  return !grid.isVoid(cellKey(r, c))
}

const DIR_CHAR: Record<OuterClueRunDirection, string> = { up: '↑', down: '↓', left: '←', right: '→' }
const OPPOSITE: Record<OuterClueRunDirection, OuterClueRunDirection> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
}

// Rossini arrows run along the row/column: 'increasing' points away from the
// clue (digits rise along the run), 'decreasing' points at it. Single-run
// clues render the classic centered glyph; multi-run clues use per-run
// chevrons (see runArrowsFor) instead.
function rossiniGlyph(dirs: OuterClueRunDirection[], direction: string): string {
  if (dirs.length !== 1) return '_'
  return DIR_CHAR[direction === 'increasing' ? dirs[0] : OPPOSITE[dirs[0]]]
}

// A small chevron anchored near the `anchor` edge of the clue cell, pointing
// `point`ward. Value clues point at their runs; rossini chevrons flip to
// encode decreasing (pointing back at the clue, like the ring glyphs).
function runArrowPath(pos: { row: number; col: number }, anchor: OuterClueRunDirection, point: OuterClueRunDirection): string {
  const c = outerCellCenter(pos.row, pos.col)
  const a = OUTER_RUN_STEP[anchor]
  const p = OUTER_RUN_STEP[point]
  const ax = c.x + a.dCol * CELL_SIZE * 0.36
  const ay = c.y + a.dRow * CELL_SIZE * 0.36
  const tipX = ax + p.dCol * 7
  const tipY = ay + p.dRow * 7
  const baseX = ax - p.dCol * 7
  const baseY = ay - p.dRow * 7
  const wing = 3.5
  const wx = -p.dRow * wing
  const wy = p.dCol * wing
  const backX = tipX - p.dCol * 4.5
  const backY = tipY - p.dRow * 4.5
  return `M ${baseX} ${baseY} L ${tipX} ${tipY} M ${backX + wx} ${backY + wy} L ${tipX} ${tipY} L ${backX - wx} ${backY - wy}`
}

// The toggleable run arrows for a straight clue on a multi-run position.
// Enabled runs always show; disabled ones show ghosted only while the clue's
// own tool is active in setting mode (that's when they're clickable).
function runArrowsFor(
  clue: { id: string; type: string; directions?: OuterClueRunDirection[]; rossiniDirection?: string },
  pos: { row: number; col: number },
  candidates: OuterClueRunDirection[],
): Array<{ key: string; d: string; opacity: number }> {
  if (candidates.length < 2) return []
  const enabled = new Set((clue.directions ?? candidates).filter((d) => candidates.includes(d)))
  const toolActive = editor.mode === 'setting' && editor.activeTool === clue.type
  return candidates
    .filter((dir) => enabled.has(dir) || toolActive)
    .map((dir) => ({
      key: `${clue.id}-${dir}`,
      d: runArrowPath(pos, dir, clue.type === 'rossini' && clue.rossiniDirection === 'decreasing' ? OPPOSITE[dir] : dir),
      opacity: enabled.has(dir) ? 1 : 0.25,
    }))
}

const clues = computed<RenderedClue[]>(() =>
  editor.outerClues.flatMap((clue) => {
    const pos = parseOuterKey(clue.location)
    if (!pos) return []
    const st = cs.textStyle(clue.type)
    const center = outerCellCenter(pos.row, pos.col)
    const arrow = clue.type === 'little_killers' && clue.direction
      ? littleKillerArrow(pos, clue.direction)
      : null
    const candidates = clue.type === 'little_killers'
      ? []
      : outerClueDirections(pos.row, pos.col, grid.rows, grid.cols, isLive)
    const multi = candidates.length > 1
    // Multi-run rossini clues speak entirely through their per-run chevrons.
    const text = clue.type === 'rossini'
      ? (multi ? '' : clue.rossiniDirection ? rossiniGlyph(candidates, clue.rossiniDirection) : '_')
      : clue.value === null ? '_' : String(clue.value)
    return [{
      key: clue.id,
      x: center.x + (arrow?.offset.dx ?? 0),
      y: center.y + (arrow?.offset.dy ?? 0),
      text,
      fontSize: st.size * CELL_SIZE,
      // Per-instance setter colors beat the theme style; the little killer's
      // textColor/arrowColor beat the generic `color` for their element.
      color: clue.textColor ?? clue.color ?? st.fontColor,
      arrowColor: clue.arrowColor ?? clue.color ?? st.fontColor,
      selected: editor.selectedOuterClueId === clue.id,
      arrowPath: arrow?.path ?? null,
      runArrows: runArrowsFor(clue, pos, candidates),
    }]
  }),
)

// Light dotted separators between outer ring cells, shown while placing.
// Void cells ARE clue space, so the same lattice continues through them:
// ticks between adjacent void cells, and across the grid edge to the ring —
// the void zone reads as more outside.
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
  const vTick = (x: number, y0: number) =>
    segs.push({ x1: x, y1: y0 + SEPARATOR_INSET, x2: x, y2: y0 + CELL_SIZE - SEPARATOR_INSET })
  const hTick = (x0: number, y: number) =>
    segs.push({ x1: x0 + SEPARATOR_INSET, y1: y, x2: x0 + CELL_SIZE - SEPARATOR_INSET, y2: y })
  for (const key of grid.voidCells) {
    const { row, col } = keyToRowCol(key)
    const x0 = PADDING + col * CELL_SIZE
    const y0 = PADDING + row * CELL_SIZE
    // Shared boundaries between void neighbors (emitted from the lesser cell
    // of each pair only). Void↔live boundaries stay the solid region outline.
    if (grid.isVoid(cellKey(row, col + 1))) vTick(x0 + CELL_SIZE, y0)
    if (grid.isVoid(cellKey(row + 1, col))) hTick(x0, y0 + CELL_SIZE)
    // Grid-edge boundaries facing the ring join the two spaces into one grid.
    if (row === 0) hTick(x0, PADDING)
    if (row === grid.rows - 1) hTick(x0, y0 + CELL_SIZE)
    if (col === 0) vTick(PADDING, y0)
    if (col === grid.cols - 1) vTick(x0 + CELL_SIZE, y0)
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
        :style="{ stroke: GLOW_COLOR }"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <path
        v-if="clue.arrowPath"
        :d="clue.arrowPath"
        fill="none"
        :stroke="clue.arrowColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-for="run in clue.runArrows"
        :key="run.key"
        :d="run.d"
        fill="none"
        :stroke="clue.arrowColor"
        :stroke-opacity="run.opacity"
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
