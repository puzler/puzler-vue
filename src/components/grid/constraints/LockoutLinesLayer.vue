<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellsToPath, cellCenter } from '@/utils/linePath'
import type { ConstraintLineData } from '@/types/constraints'
import { useConstraintStyles, withColorOverrides, type ResolvedBetweenLine } from '@/composables/useConstraintStyles'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Line + diamond style resolved through the theme (default ⊕ override, gated by Enable Custom Styles).
const loStyle = computed(() => cs.lockoutLineStyle())

// Diamond path centred on a point; `r` is the half-diagonal (same slot as the
// between-line bulb radius, so themes size both the same way).
function diamondPath(c: { x: number; y: number }, r: number): string {
  return `M ${c.x} ${c.y - r} L ${c.x + r} ${c.y} L ${c.x} ${c.y + r} L ${c.x - r} ${c.y} Z`
}

interface RenderedLockoutLine {
  id: string
  path: string
  start: string
  end: string
  style: ResolvedBetweenLine
}

const lockoutLineInstances = computed<RenderedLockoutLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'lockout_lines')
    .map(i => {
      const data = i.data as ConstraintLineData
      return {
        id: i.id,
        path: cellsToPath(data.cells),
        start: diamondPath(cellCenter(data.cells[0]), loStyle.value.circleRadius),
        end: diamondPath(cellCenter(data.cells[data.cells.length - 1]), loStyle.value.circleRadius),
        // Per-instance setter colors beat the theme style. The generic
        // `color` reaches the line and the diamond fill; the diamond outline
        // only changes via bulbOutlineColor so the ends stay legible.
        style: withColorOverrides(loStyle.value, {
          lineColor: data.lineColor ?? data.color,
          circleFill: data.bulbFillColor ?? data.color,
          circleStrokeColor: data.bulbOutlineColor,
        }),
      }
    })
    .filter(l => l.path),
)

const pendingLockoutLine = computed(() => {
  if (editor.activeTool !== 'lockout_lines') return null
  const cells = editor.pendingLineCells
  if (cells.length < 1) return null
  return {
    path: cells.length >= 2 ? cellsToPath(cells) : null,
    start: diamondPath(cellCenter(cells[0]), loStyle.value.circleRadius),
    end: cells.length >= 2 ? diamondPath(cellCenter(cells[cells.length - 1]), loStyle.value.circleRadius) : null,
  }
})
</script>

<template>
  <g>
    <g
      v-for="lo in lockoutLineInstances"
      :key="lo.id"
    >
      <path
        :d="lo.path"
        fill="none"
        :stroke="lo.style.lineColor"
        :stroke-width="lo.style.lineStrokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
      <path
        :d="lo.start"
        :fill="lo.style.circleFill"
        :stroke="lo.style.circleStrokeColor"
        :stroke-width="lo.style.circleStrokeWidth"
        pointer-events="none"
      />
      <path
        :d="lo.end"
        :fill="lo.style.circleFill"
        :stroke="lo.style.circleStrokeColor"
        :stroke-width="lo.style.circleStrokeWidth"
        pointer-events="none"
      />
    </g>

    <!-- Pending preview -->
    <g v-if="pendingLockoutLine">
      <path
        v-if="pendingLockoutLine.path"
        :d="pendingLockoutLine.path"
        fill="none"
        :stroke="loStyle.lineColor"
        :stroke-width="loStyle.lineStrokeWidth"
        stroke-opacity="0.55"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
      <path
        :d="pendingLockoutLine.start"
        :fill="loStyle.circleFill"
        :stroke="loStyle.circleStrokeColor"
        :stroke-width="loStyle.circleStrokeWidth"
        fill-opacity="0.55"
        stroke-opacity="0.55"
        pointer-events="none"
      />
      <path
        v-if="pendingLockoutLine.end"
        :d="pendingLockoutLine.end"
        :fill="loStyle.circleFill"
        :stroke="loStyle.circleStrokeColor"
        :stroke-width="loStyle.circleStrokeWidth"
        fill-opacity="0.55"
        stroke-opacity="0.55"
        pointer-events="none"
      />
    </g>
  </g>
</template>
