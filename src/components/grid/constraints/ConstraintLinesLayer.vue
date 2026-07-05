<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellsToPath } from '@/utils/linePath'
import { CONSTRAINT_LINE_TYPES } from '@/types/constraints'
import type { ConstraintLineData } from '@/types/constraints'
import { useConstraintStyles, withColorOverrides, type ResolvedLineStyle, type LineKey } from '@/composables/useConstraintStyles'

// Constraint lines (renban, whispers, palindrome, region sum) plus the pending line
// being drawn, styled through the theme resolver (default ⊕ active-theme override,
// gated by Enable Custom Styles). between_lines is excluded here — BetweenLinesLayer
// renders it.

const editor = useEditorStore()
const cs = useConstraintStyles()

const isLineTool = (type: string) => CONSTRAINT_LINE_TYPES.has(type) && type !== 'between_lines'

interface RenderedLine { id: string; path: string; style: ResolvedLineStyle }

const constraintLines = computed<RenderedLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => isLineTool(i.type))
    .map(i => {
      const data = i.data as ConstraintLineData
      return {
        id: i.id,
        path: cellsToPath(data.cells),
        // Per-instance setter color beats the theme-resolved style.
        style: withColorOverrides(cs.lineStyle(i.type as LineKey), { color: data.color }),
      }
    }),
)

const pendingPath = computed(() => isLineTool(editor.activeTool) ? cellsToPath(editor.pendingLineCells) : null)

const pendingStyle = computed<ResolvedLineStyle | null>(() =>
  isLineTool(editor.activeTool) ? cs.lineStyle(editor.activeTool as LineKey) : null,
)
</script>

<template>
  <g>
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
