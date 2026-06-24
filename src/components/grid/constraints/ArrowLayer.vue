<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter, cellsToPath } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { ARROW_STYLE } from '@/types/constraints'
import type { ArrowData } from '@/types/constraints'
import { useConstraintStyles } from '@/composables/useConstraintStyles'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Only the color is themeable in v1 (default ⊕ override, gated); the bulb/line geometry below
// stays at the ARROW_STYLE defaults.
const arrowColor = computed(() => cs.arrowStyle().color)

const BULB_OUTER = ARROW_STYLE.bulbRadius * 2
const BULB_INNER = BULB_OUTER - ARROW_STYLE.outlineWidth * 2

// Arrows stop short of the final cell center so several can point into the
// same cell without touching (same idea as the thermometer tip inset, but
// tighter — the thin arrow lines stay readable with a smaller gap)
const TIP_INSET = CELL_SIZE * 0.15

// Final point of the arrow line: the last cell center pulled back along the
// final segment by TIP_INSET
function arrowTip(cells: string[]): { x: number; y: number } | null {
  if (cells.length < 2) return null
  const prev = cellCenter(cells[cells.length - 2])
  const end = cellCenter(cells[cells.length - 1])
  const dx = end.x - prev.x
  const dy = end.y - prev.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return null
  return { x: end.x - (dx / len) * TIP_INSET, y: end.y - (dy / len) * TIP_INSET }
}

function arrowLinePath(cells: string[]): string {
  const points = cells.map(cellCenter)
  const tip = arrowTip(cells)
  if (tip) points[points.length - 1] = tip
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

// Chevron at the (inset) tip, pointing from the second-to-last cell outward
function arrowHeadPath(cells: string[]): string | null {
  const tip = arrowTip(cells)
  if (!tip) return null
  const prev = cellCenter(cells[cells.length - 2])
  const dx = tip.x - prev.x
  const dy = tip.y - prev.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return null
  const ux = dx / len
  const uy = dy / len
  const L = ARROW_STYLE.headLength
  const bx = tip.x - ux * L
  const by = tip.y - uy * L
  const px = -uy * L * ARROW_STYLE.headSpread
  const py = ux * L * ARROW_STYLE.headSpread
  return `M ${bx + px} ${by + py} L ${tip.x} ${tip.y} L ${bx - px} ${by - py}`
}

interface RenderedArrowInstance {
  id: string
  bulbCircle: { x: number; y: number } | null
  bulbPath: string | null
  linePaths: string[]
  headPaths: string[]
}

function renderInstance(id: string, data: ArrowData): RenderedArrowInstance {
  return {
    id,
    bulbCircle: data.bulbCells.length === 1 ? cellCenter(data.bulbCells[0]) : null,
    bulbPath: data.bulbCells.length > 1 ? cellsToPath(data.bulbCells) : null,
    linePaths: data.arrows.map(p => arrowLinePath(p.cells)),
    headPaths: data.arrows.map(p => arrowHeadPath(p.cells)).filter((p): p is string => p !== null),
  }
}

const arrowInstances = computed<RenderedArrowInstance[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'arrow')
    .map(i => renderInstance(i.id, i.data as ArrowData)),
)

const pending = computed<RenderedArrowInstance | null>(() => {
  if (editor.activeTool !== 'arrow') return null
  const cells = editor.pendingLineCells
  if (cells.length === 0) return null
  if (editor.pendingArrowParentId) {
    if (cells.length < 2) return null
    return renderInstance('pending', { bulbCells: [], arrows: [{ cells }] })
  }
  return renderInstance('pending', { bulbCells: cells, arrows: [] })
})
</script>

<template>
  <g pointer-events="none">
    <g
      v-for="inst in [...arrowInstances, ...(pending ? [pending] : [])]"
      :key="inst.id"
      :opacity="inst.id === 'pending' ? 0.55 : 1"
    >
      <!-- Arrow lines and heads first so the bulb covers their anchors -->
      <path
        v-for="(line, i) in inst.linePaths"
        :key="`line-${i}`"
        :d="line"
        fill="none"
        :stroke="arrowColor"
        :stroke-width="ARROW_STYLE.lineWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-for="(head, i) in inst.headPaths"
        :key="`head-${i}`"
        :d="head"
        fill="none"
        :stroke="arrowColor"
        :stroke-width="ARROW_STYLE.lineWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Single-cell bulb: outlined circle. Multi-cell bulb: pill drawn as a
           thick outline stroke with a white stroke inside it -->
      <circle
        v-if="inst.bulbCircle"
        :cx="inst.bulbCircle.x"
        :cy="inst.bulbCircle.y"
        :r="ARROW_STYLE.bulbRadius"
        :style="{ fill: 'var(--color-grid-cell)' }"
        :stroke="arrowColor"
        :stroke-width="ARROW_STYLE.outlineWidth"
      />
      <template v-if="inst.bulbPath">
        <path
          :d="inst.bulbPath"
          fill="none"
          :stroke="arrowColor"
          :stroke-width="BULB_OUTER"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          :d="inst.bulbPath"
          fill="none"
          :style="{ stroke: 'var(--color-grid-cell)' }"
          :stroke-width="BULB_INNER"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>
    </g>
  </g>
</template>
