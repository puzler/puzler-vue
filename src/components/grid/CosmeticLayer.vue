<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useOuterMargins } from '@/composables/useOuterMargins'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import CosmeticLineComp from '@/components/cosmetics/CosmeticLine.vue'
import CosmeticShape from '@/components/cosmetics/CosmeticShape.vue'
import CosmeticText from '@/components/cosmetics/CosmeticText.vue'
import { cellsToPath } from '@/utils/linePath'
import { DEFAULT_LINE_STYLE, DEFAULT_SHAPE_STYLE, DEFAULT_TEXT_STYLE, cosmeticPos } from '@/types/constraints'
import type { CosmeticLineData, LineStyle, ShapeData, TextData } from '@/types/constraints'

const editor = useEditorStore()
const grid = useGridStore()
const margins = useOuterMargins()

// Matches OuterCluesLayer's separator color.
const GUIDE_COLOR = '#b8b3a8'

// Dotted lattice extending the grid into the external space, far enough to
// enclose the outermost off-grid object. Shown only while a placement tool is
// active in setting mode; extent derives from the same margins that size the
// canvas, so one ring with "show external space" growing as objects move out.
const guideLines = computed<Array<{ x1: number; y1: number; x2: number; y2: number }>>(() => {
  if (editor.mode !== 'setting' || (editor.activeTool !== 'text' && editor.activeTool !== 'shape')) return []
  const m = margins.value
  const rl = Math.ceil(m.left / CELL_SIZE)
  const rr = Math.ceil(m.right / CELL_SIZE)
  const rt = Math.ceil(m.top / CELL_SIZE)
  const rb = Math.ceil(m.bottom / CELL_SIZE)
  if (!rl && !rr && !rt && !rb) return []
  const cols = grid.cols, rows = grid.rows
  const X0 = -rl, X1 = cols + rr, Y0 = -rt, Y1 = rows + rb
  const svg = (n: number) => PADDING + n * CELL_SIZE
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const push = (x1: number, y1: number, x2: number, y2: number) => {
    if (x1 === x2 && y1 === y2) return
    segs.push({ x1: svg(x1), y1: svg(y1), x2: svg(x2), y2: svg(y2) })
  }
  // Vertical lines: inside the grid's column span only the external bands above
  // and below are drawn (the interior has solid grid lines); outside it spans full.
  for (let c = X0; c <= X1; c++) {
    if (c >= 0 && c <= cols) { push(c, Y0, c, 0); push(c, rows, c, Y1) }
    else push(c, Y0, c, Y1)
  }
  for (let r = Y0; r <= Y1; r++) {
    if (r >= 0 && r <= rows) { push(X0, r, 0, r); push(cols, r, X1, r) }
    else push(X0, r, X1, r)
  }
  return segs
})

// Translucent preview of the object that would be placed at the snapped pointer.
const ghost = computed(() => {
  const pos = editor.ghostPos
  if (!pos) return null
  if (editor.activeTool === 'text') {
    return { type: 'text' as const, pos, text: '?', textStyle: editor.activeTextPreset?.style ?? DEFAULT_TEXT_STYLE }
  }
  if (editor.activeTool === 'shape') {
    return { type: 'shape' as const, pos, content: '', shapeStyle: editor.activeShapePreset?.style ?? DEFAULT_SHAPE_STYLE }
  }
  return null
})

// ── Lines ────────────────────────────────────────────────────────────────────

interface ResolvedLine { id: string; cells: string[]; style: LineStyle }

const lineInstances = computed<ResolvedLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'cosmetic_line')
    .map(i => {
      const data = i.data as CosmeticLineData
      const style = editor.linePresets.find(p => p.id === data.presetId)?.style ?? DEFAULT_LINE_STYLE
      return { id: i.id, cells: data.cells, style }
    }),
)

const pendingPath = computed(() => cellsToPath(editor.pendingLineCells))
const activeLineStyle = computed(() => editor.activeLinePreset?.style ?? DEFAULT_LINE_STYLE)

// ── Shapes ───────────────────────────────────────────────────────────────────

const shapeInstances = computed(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'shape')
    .map(i => {
      const d = i.data as ShapeData
      const style = editor.shapePresets.find(p => p.id === d.presetId)?.style ?? DEFAULT_SHAPE_STYLE
      return {
        id: i.id,
        pos: cosmeticPos(d),
        content: d.content ?? '',
        rotation: d.rotation ?? 0,
        style,
        selected: editor.selectedCosmeticId === i.id,
      }
    }),
)

// ── Text ─────────────────────────────────────────────────────────────────────

const textInstances = computed(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'text')
    .map(i => {
      const d = i.data as TextData
      const preset = editor.textPresets.find(p => p.id === d.presetId)
      return {
        id: i.id,
        pos: cosmeticPos(d),
        text: d.content ?? '?',
        rotation: d.rotation ?? 0,
        style: preset?.style ?? DEFAULT_TEXT_STYLE,
        selected: editor.selectedCosmeticId === i.id,
      }
    }),
)
</script>

<template>
  <g>
    <!-- External-space guide grid (behind everything) -->
    <line
      v-for="(s, i) in guideLines"
      :key="`guide-${i}`"
      :x1="s.x1"
      :y1="s.y1"
      :x2="s.x2"
      :y2="s.y2"
      :stroke="GUIDE_COLOR"
      stroke-width="1"
      stroke-dasharray="2 3"
      pointer-events="none"
    />

    <!-- Lines -->
    <CosmeticLineComp
      v-for="inst in lineInstances"
      :key="inst.id"
      :cells="inst.cells"
      :line-style="inst.style"
    />
    <path
      v-if="pendingPath && editor.activeTool === 'cosmetic_line'"
      :d="pendingPath"
      :stroke="activeLineStyle.color"
      :stroke-width="activeLineStyle.strokeWidth"
      :opacity="activeLineStyle.opacity * 0.55"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      pointer-events="none"
    />

    <!-- Shapes -->
    <CosmeticShape
      v-for="inst in shapeInstances"
      :key="inst.id"
      :pos="inst.pos"
      :content="inst.content"
      :shape-style="inst.style"
      :rotation="inst.rotation"
      :selected="inst.selected"
    />

    <!-- Text -->
    <CosmeticText
      v-for="inst in textInstances"
      :key="inst.id"
      :pos="inst.pos"
      :text="inst.text"
      :text-style="inst.style"
      :rotation="inst.rotation"
      :selected="inst.selected"
    />

    <!-- Placement ghost preview -->
    <CosmeticShape
      v-if="ghost?.type === 'shape'"
      :pos="ghost.pos"
      :content="ghost.content"
      :shape-style="ghost.shapeStyle"
      :opacity="0.4"
    />
    <CosmeticText
      v-else-if="ghost?.type === 'text'"
      :pos="ghost.pos"
      :text="ghost.text"
      :text-style="ghost.textStyle"
      :opacity="0.4"
    />
  </g>
</template>
