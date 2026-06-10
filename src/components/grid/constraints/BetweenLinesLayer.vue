<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellsToPath, cellCenter } from '@/utils/linePath'
import { BETWEEN_LINE_STYLE } from '@/types/constraints'
import type { ConstraintLineData } from '@/types/constraints'

const editor = useEditorStore()

interface RenderedBetweenLine {
  id: string
  path: string
  start: { x: number; y: number }
  end: { x: number; y: number }
}

const betweenLineInstances = computed<RenderedBetweenLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'between_lines')
    .map(i => {
      const cells = (i.data as ConstraintLineData).cells
      return {
        id: i.id,
        path: cellsToPath(cells),
        start: cellCenter(cells[0]),
        end: cellCenter(cells[cells.length - 1]),
      }
    })
    .filter(l => l.path),
)

const pendingBetweenLine = computed(() => {
  if (editor.activeTool !== 'between_lines') return null
  const cells = editor.pendingLineCells
  if (cells.length < 1) return null
  return {
    path: cells.length >= 2 ? cellsToPath(cells) : null,
    start: cellCenter(cells[0]),
    end: cells.length >= 2 ? cellCenter(cells[cells.length - 1]) : null,
  }
})
</script>

<template>
  <g>
    <g
      v-for="bl in betweenLineInstances"
      :key="bl.id"
    >
      <path
        :d="bl.path"
        fill="none"
        :stroke="BETWEEN_LINE_STYLE.lineColor"
        :stroke-width="BETWEEN_LINE_STYLE.lineStrokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
      <circle
        :cx="bl.start.x"
        :cy="bl.start.y"
        :r="BETWEEN_LINE_STYLE.circleRadius"
        :fill="BETWEEN_LINE_STYLE.circleFill"
        :stroke="BETWEEN_LINE_STYLE.circleStrokeColor"
        :stroke-width="BETWEEN_LINE_STYLE.circleStrokeWidth"
        pointer-events="none"
      />
      <circle
        :cx="bl.end.x"
        :cy="bl.end.y"
        :r="BETWEEN_LINE_STYLE.circleRadius"
        :fill="BETWEEN_LINE_STYLE.circleFill"
        :stroke="BETWEEN_LINE_STYLE.circleStrokeColor"
        :stroke-width="BETWEEN_LINE_STYLE.circleStrokeWidth"
        pointer-events="none"
      />
    </g>

    <!-- Pending preview -->
    <g v-if="pendingBetweenLine">
      <path
        v-if="pendingBetweenLine.path"
        :d="pendingBetweenLine.path"
        fill="none"
        :stroke="BETWEEN_LINE_STYLE.lineColor"
        :stroke-width="BETWEEN_LINE_STYLE.lineStrokeWidth"
        stroke-opacity="0.55"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
      <circle
        :cx="pendingBetweenLine.start.x"
        :cy="pendingBetweenLine.start.y"
        :r="BETWEEN_LINE_STYLE.circleRadius"
        :fill="BETWEEN_LINE_STYLE.circleFill"
        :stroke="BETWEEN_LINE_STYLE.circleStrokeColor"
        :stroke-width="BETWEEN_LINE_STYLE.circleStrokeWidth"
        fill-opacity="0.55"
        stroke-opacity="0.55"
        pointer-events="none"
      />
      <circle
        v-if="pendingBetweenLine.end"
        :cx="pendingBetweenLine.end.x"
        :cy="pendingBetweenLine.end.y"
        :r="BETWEEN_LINE_STYLE.circleRadius"
        :fill="BETWEEN_LINE_STYLE.circleFill"
        :stroke="BETWEEN_LINE_STYLE.circleStrokeColor"
        :stroke-width="BETWEEN_LINE_STYLE.circleStrokeWidth"
        fill-opacity="0.55"
        stroke-opacity="0.55"
        pointer-events="none"
      />
    </g>
  </g>
</template>
