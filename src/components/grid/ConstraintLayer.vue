<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { cellsToPath, cellCenter } from '@/utils/linePath'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { CONSTRAINT_LINE_TYPES, CONSTRAINT_LINE_STYLES, THERMO_STYLE } from '@/types/constraints'
import type { ConstraintLineData, ThermometerData } from '@/types/constraints'

const editor = useEditorStore()
const grid = useGridStore()

// ── Diagonal lines ────────────────────────────────────────────────────────────

const DIAGONAL_BLUE = '#93c5fd'
const DIAGONAL_RED  = '#f87171'

interface DiagonalLine { x1: number; y1: number; x2: number; y2: number; color: string }

const diagonalLines = computed<DiagonalLine[]>(() => {
  const v = editor.activeGlobalVariants
  const left   = PADDING
  const top    = PADDING
  const right  = PADDING + grid.cols * CELL_SIZE
  const bottom = PADDING + grid.rows * CELL_SIZE
  const lines: DiagonalLine[] = []
  if (v.has('positive_diagonal'))      lines.push({ x1: left, y1: top,    x2: right, y2: bottom, color: DIAGONAL_BLUE })
  if (v.has('negative_diagonal'))      lines.push({ x1: left, y1: bottom, x2: right, y2: top,    color: DIAGONAL_BLUE })
  if (v.has('anti_positive_diagonal')) lines.push({ x1: left, y1: top,    x2: right, y2: bottom, color: DIAGONAL_RED })
  if (v.has('anti_negative_diagonal')) lines.push({ x1: left, y1: bottom, x2: right, y2: top,    color: DIAGONAL_RED })
  return lines
})

interface RenderedLine {
  id: string
  path: string
  style: typeof CONSTRAINT_LINE_STYLES[string]
}

const constraintLines = computed<RenderedLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => CONSTRAINT_LINE_TYPES.has(i.type))
    .map(i => ({
      id: i.id,
      path: cellsToPath((i.data as ConstraintLineData).cells),
      style: CONSTRAINT_LINE_STYLES[i.type],
    }))
    .filter(l => l.style),
)

const pendingPath = computed(() => {
  if (!CONSTRAINT_LINE_TYPES.has(editor.activeTool)) return null
  return cellsToPath(editor.pendingLineCells)
})

const pendingStyle = computed(() => CONSTRAINT_LINE_STYLES[editor.activeTool] ?? null)

// ── Thermometers ──────────────────────────────────────────────────────────────

// How far from the tip cell center the line stops (leaves a visible gap)
const TIP_INSET = CELL_SIZE * 0.3

function thermoEdgePath(from: string, to: string, isTip: boolean): string {
  const a = cellCenter(from)
  const b = cellCenter(to)
  if (!isTip) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const ex = b.x - (dx / len) * TIP_INSET
  const ey = b.y - (dy / len) * TIP_INSET
  return `M ${a.x} ${a.y} L ${ex} ${ey}`
}

interface RenderedThermo {
  id: string
  bulb: { x: number; y: number }
  edgePaths: string[]
}

const thermoInstances = computed<RenderedThermo[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'thermometer')
    .map(i => {
      const data = i.data as ThermometerData
      const sources = new Set(data.edges.map(e => e.from))
      return {
        id: i.id,
        bulb: cellCenter(data.root),
        edgePaths: data.edges.map(e => thermoEdgePath(e.from, e.to, !sources.has(e.to))),
      }
    }),
)

const pendingThermoPath = computed(() => {
  if (editor.activeTool !== 'thermometer') return null
  const cells = editor.pendingLineCells
  if (cells.length < 2) return null
  // Shorten only the final segment's endpoint
  const paths: string[] = []
  for (let i = 0; i < cells.length - 1; i++) {
    const isTip = i === cells.length - 2
    paths.push(thermoEdgePath(cells[i], cells[i + 1], isTip))
  }
  return paths.join(' ')
})

const pendingThermoBulb = computed(() => {
  if (editor.activeTool !== 'thermometer') return null
  if (editor.pendingLineCells.length < 1) return null
  if (editor.pendingBranchThermoId !== null) return null
  return cellCenter(editor.pendingLineCells[0])
})
</script>

<template>
  <g>
    <!-- Diagonal lines -->
    <line
      v-for="(d, i) in diagonalLines"
      :key="i"
      :x1="d.x1"
      :y1="d.y1"
      :x2="d.x2"
      :y2="d.y2"
      :stroke="d.color"
      stroke-width="2"
      stroke-opacity="0.85"
      stroke-linecap="round"
      pointer-events="none"
    />

    <!-- Thermometers (rendered before constraint lines so lines overlap bulbs) -->
    <g
      v-for="thermo in thermoInstances"
      :key="thermo.id"
    >
      <circle
        :cx="thermo.bulb.x"
        :cy="thermo.bulb.y"
        :r="THERMO_STYLE.bulbRadius"
        :fill="THERMO_STYLE.color"
        pointer-events="none"
      />
      <path
        v-for="(edgePath, idx) in thermo.edgePaths"
        :key="idx"
        :d="edgePath"
        fill="none"
        :stroke="THERMO_STYLE.color"
        :stroke-width="THERMO_STYLE.strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
    </g>

    <!-- Pending thermometer preview -->
    <g v-if="pendingThermoPath || pendingThermoBulb">
      <circle
        v-if="pendingThermoBulb"
        :cx="pendingThermoBulb.x"
        :cy="pendingThermoBulb.y"
        :r="THERMO_STYLE.bulbRadius"
        :fill="THERMO_STYLE.color"
        :fill-opacity="0.55"
        pointer-events="none"
      />
      <path
        v-if="pendingThermoPath"
        :d="pendingThermoPath"
        fill="none"
        :stroke="THERMO_STYLE.color"
        :stroke-width="THERMO_STYLE.strokeWidth"
        :stroke-opacity="0.55"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
    </g>

    <!-- Constraint lines (renban, whispers, palindrome, region sum) -->
    <path
      v-for="line in constraintLines"
      :key="line.id"
      :d="line.path"
      fill="none"
      :stroke="line.style.color"
      :stroke-width="line.style.strokeWidth"
      :stroke-opacity="line.style.opacity"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
    <path
      v-if="pendingPath && pendingStyle"
      :d="pendingPath"
      fill="none"
      :stroke="pendingStyle.color"
      :stroke-width="pendingStyle.strokeWidth"
      :stroke-opacity="pendingStyle.opacity * 0.55"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
  </g>
</template>
