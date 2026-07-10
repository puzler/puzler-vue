<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, keyToRowCol } from '@/composables/useGrid'
import { DEFAULT_BORDER_STYLE, borderKeyCells } from '@/types/constraints'
import type { CosmeticBorderData, BorderStyle } from '@/types/constraints'

// Cosmetic border segments plus the in-progress drag preview. Visually part of
// the grid chrome (square caps, region-border default style), rendered just
// above GridBorders via CosmeticLayer.

const editor = useEditorStore()

interface BorderSegment { x1: number; y1: number; x2: number; y2: number }

// The SVG segment along the shared edge of a borderKey's two cells: vertical
// neighbours share a horizontal edge and vice versa. Malformed keys (JSON
// editor input) resolve to nothing.
function edgeSegment(edge: string): BorderSegment | null {
  const [a, b] = borderKeyCells(edge)
  if (!a || !b) return null
  const ca = keyToRowCol(a)
  const cb = keyToRowCol(b)
  const row = Math.max(ca.row, cb.row)
  const col = Math.max(ca.col, cb.col)
  if (ca.row !== cb.row && ca.col === cb.col) {
    const y = PADDING + row * CELL_SIZE
    return { x1: PADDING + col * CELL_SIZE, y1: y, x2: PADDING + (col + 1) * CELL_SIZE, y2: y }
  }
  if (ca.col !== cb.col && ca.row === cb.row) {
    const x = PADDING + col * CELL_SIZE
    return { x1: x, y1: PADDING + row * CELL_SIZE, x2: x, y2: PADDING + (row + 1) * CELL_SIZE }
  }
  return null
}

interface ResolvedBorder { key: string; segment: BorderSegment; style: BorderStyle }

const borderSegments = computed<ResolvedBorder[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'cosmetic_border')
    .flatMap(i => {
      const data = i.data as CosmeticBorderData
      const style = editor.borderPresets.find(p => p.id === data.presetId)?.style ?? DEFAULT_BORDER_STYLE
      return data.edges.flatMap(edge => {
        const segment = edgeSegment(edge)
        return segment ? [{ key: `${i.id}-${edge}`, segment, style }] : []
      })
    }),
)

const pendingSegments = computed<BorderSegment[]>(() =>
  editor.pendingBorderEdges.flatMap(edge => {
    const segment = edgeSegment(edge)
    return segment ? [segment] : []
  }),
)
const activeStyle = computed(() => editor.activeBorderPreset?.style ?? DEFAULT_BORDER_STYLE)
</script>

<template>
  <g pointer-events="none">
    <line
      v-for="b in borderSegments"
      :key="b.key"
      :x1="b.segment.x1"
      :y1="b.segment.y1"
      :x2="b.segment.x2"
      :y2="b.segment.y2"
      :stroke="b.style.color"
      :stroke-width="b.style.strokeWidth"
      :opacity="b.style.opacity"
      stroke-linecap="square"
    />
    <line
      v-for="(s, i) in pendingSegments"
      :key="`pending-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
      :stroke="activeStyle.color"
      :stroke-width="activeStyle.strokeWidth"
      :opacity="activeStyle.opacity * 0.55"
      stroke-linecap="square"
    />
  </g>
</template>
