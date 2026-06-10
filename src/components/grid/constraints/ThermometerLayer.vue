<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { THERMO_STYLE } from '@/types/constraints'
import type { ThermometerData } from '@/types/constraints'

const editor = useEditorStore()

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

    <!-- Pending preview -->
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
  </g>
</template>
