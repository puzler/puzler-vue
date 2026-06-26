<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { THERMO_TYPES } from '@/types/constraints'
import type { ThermometerData } from '@/types/constraints'
import { useConstraintStyles } from '@/composables/useConstraintStyles'
import HollowThermo from './HollowThermo.vue'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Color is themeable per type (default ⊕ override, gated); bulb radius + line
// width stay at the default. Slow thermos reuse the same geometry but render as a
// hollow outline (see HOLLOW below).
const ts = computed(() => cs.thermoStyle())
const sts = computed(() => cs.slowThermoStyle())

// How far from the tip cell center the line stops (leaves a visible gap)
const TIP_INSET = CELL_SIZE * 0.3
// Thickness of the outline border for hollow (slow) thermos.
const OUTLINE_WIDTH = 3

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

// Bounding box (in user-space coords) covering a thermo's cells, padded enough to
// contain the bulb + line. Used as the fill rect for the hollow mask.
function bbox(cells: string[], bulbRadius: number, strokeWidth: number) {
  const pad = bulbRadius + strokeWidth
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const key of cells) {
    const p = cellCenter(key)
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
}

interface RenderedThermo {
  id: string
  hollow: boolean
  color: string
  bulbRadius: number
  strokeWidth: number
  bulb: { x: number; y: number }
  edgePaths: string[]
  box: { x: number; y: number; width: number; height: number }
}

const thermoInstances = computed<RenderedThermo[]>(() =>
  editor.cosmeticInstances
    .filter(i => THERMO_TYPES.has(i.type))
    .map(i => {
      const data = i.data as ThermometerData
      const hollow = i.type === 'slow_thermometer'
      const style = hollow ? sts.value : ts.value
      const sources = new Set(data.edges.map(e => e.from))
      const cells = [data.root, ...data.edges.flatMap(e => [e.from, e.to])]
      return {
        id: i.id,
        hollow,
        color: style.color,
        bulbRadius: style.bulbRadius,
        strokeWidth: style.strokeWidth,
        bulb: cellCenter(data.root),
        edgePaths: data.edges.map(e => thermoEdgePath(e.from, e.to, !sources.has(e.to))),
        box: bbox(cells, style.bulbRadius, style.strokeWidth),
      }
    }),
)

const pendingHollow = computed(() => editor.activeTool === 'slow_thermometer')
const pendingStyle = computed(() => (pendingHollow.value ? sts.value : ts.value))

const pendingThermoPath = computed(() => {
  if (!THERMO_TYPES.has(editor.activeTool)) return null
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
  if (!THERMO_TYPES.has(editor.activeTool)) return null
  if (editor.pendingLineCells.length < 1) return null
  if (editor.pendingBranchThermoId !== null) return null
  return cellCenter(editor.pendingLineCells[0])
})

const pendingBox = computed(() => {
  const cells = editor.pendingLineCells
  if (cells.length < 1) return null
  return bbox(cells, pendingStyle.value.bulbRadius, pendingStyle.value.strokeWidth)
})

const pendingEdgePaths = computed(() => (pendingThermoPath.value ? [pendingThermoPath.value] : []))
</script>

<template>
  <g>
    <g
      v-for="thermo in thermoInstances"
      :key="thermo.id"
    >
      <!-- Hollow (slow thermo): outline only, transparent interior. -->
      <HollowThermo
        v-if="thermo.hollow"
        :mask-id="`thermo-hollow-${thermo.id}`"
        :color="thermo.color"
        :bulb-radius="thermo.bulbRadius"
        :stroke-width="thermo.strokeWidth"
        :outline-width="OUTLINE_WIDTH"
        :edge-paths="thermo.edgePaths"
        :box="thermo.box"
        :bulb="thermo.bulb"
      />

      <!-- Filled (regular thermo) -->
      <template v-else>
        <circle
          :cx="thermo.bulb.x"
          :cy="thermo.bulb.y"
          :r="thermo.bulbRadius"
          :fill="thermo.color"
          pointer-events="none"
        />
        <path
          v-for="(edgePath, idx) in thermo.edgePaths"
          :key="idx"
          :d="edgePath"
          fill="none"
          :stroke="thermo.color"
          :stroke-width="thermo.strokeWidth"
          stroke-linecap="round"
          stroke-linejoin="round"
          pointer-events="none"
        />
      </template>
    </g>

    <!-- Pending preview -->
    <g v-if="pendingThermoPath || pendingThermoBulb">
      <!-- Hollow preview -->
      <HollowThermo
        v-if="pendingHollow && pendingBox"
        mask-id="thermo-hollow-pending"
        :color="pendingStyle.color"
        :bulb-radius="pendingStyle.bulbRadius"
        :stroke-width="pendingStyle.strokeWidth"
        :outline-width="OUTLINE_WIDTH"
        :edge-paths="pendingEdgePaths"
        :box="pendingBox"
        :bulb="pendingThermoBulb"
        :fill-opacity="0.55"
      />

      <!-- Filled preview -->
      <template v-else>
        <circle
          v-if="pendingThermoBulb"
          :cx="pendingThermoBulb.x"
          :cy="pendingThermoBulb.y"
          :r="pendingStyle.bulbRadius"
          :fill="pendingStyle.color"
          :fill-opacity="0.55"
          pointer-events="none"
        />
        <path
          v-if="pendingThermoPath"
          :d="pendingThermoPath"
          fill="none"
          :stroke="pendingStyle.color"
          :stroke-width="pendingStyle.strokeWidth"
          :stroke-opacity="0.55"
          stroke-linecap="round"
          stroke-linejoin="round"
          pointer-events="none"
        />
      </template>
    </g>
  </g>
</template>
