<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { CELL_SIZE, PADDING, cellKey, keyToRowCol } from '@/composables/useGrid'
import { useOuterMargins } from '@/composables/useOuterMargins'
import { CELL_BACKGROUND_COLORS } from '@/constraints/registry'
import { useConstraintStyles, type CellBgKey } from '@/composables/useConstraintStyles'
import { constraintLayersForSlot } from '@/constraints/layerComponents'

// Registry-derived constraint layers that render under the grid lines.
const backgroundLayers = constraintLayersForSlot('background')

const grid = useGridStore()
const editor = useEditorStore()
const player = usePlayerSettingsStore()
const margins = useOuterMargins()
const cs = useConstraintStyles()

// Conflict highlighting is a player setting on the solver page; in the setter
// it always shows (it's an authoring aid). `seen` highlighting is opt-in only.
const showConflicts = computed(() => editor.mode !== 'solving' || player.effective.highlightConflicts)
// Solvers can hide the puzzle's built-in (author-placed) cell colours so they
// can recolour freely; the setter always sees its own cosmetics.
const hideCosmeticColors = computed(() => editor.mode === 'solving' && player.effective.hideColors)

const totalW = computed(() => PADDING * 2 + grid.cols * CELL_SIZE)
const totalH = computed(() => PADDING * 2 + grid.rows * CELL_SIZE)

interface CellRect { x: number; y: number }

const activeCellRects = computed<CellRect[]>(() => {
  const rects: CellRect[] = []
  const labels = grid.cellRegionLabelMap
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if ((labels.get(cellKey(r, c)) ?? []).length > 0)
        rects.push({ x: PADDING + c * CELL_SIZE, y: PADDING + r * CELL_SIZE })
    }
  }
  return rects
})

interface ColorRect { x: number; y: number; color: string; opacity?: number }

const cellColorRects = computed<ColorRect[]>(() => {
  if (hideCosmeticColors.value) return []
  const m = editor.cosmeticCellColors
  const presets = editor.cellColorPresets
  return Object.entries(m).flatMap(([cell, presetId]) => {
    const preset = presets.find(p => p.id === presetId)
    if (!preset) return []
    const match = cell.match(/r(\d+)c(\d+)/)!
    return [{
      x: PADDING + Number(match[2]) * CELL_SIZE,
      y: PADDING + Number(match[1]) * CELL_SIZE,
      color: preset.color,
      opacity: preset.opacity,
    }]
  })
})

const pendingColorRects = computed<ColorRect[]>(() => {
  const preset = editor.activeCellColorPreset
  if (!preset) return []
  return editor.pendingBrushCells.flatMap(cell => {
    const match = cell.match(/r(\d+)c(\d+)/)!
    return [{
      x: PADDING + Number(match[2]) * CELL_SIZE,
      y: PADDING + Number(match[1]) * CELL_SIZE,
      color: preset.color,
      opacity: 0.55 * (preset.opacity ?? 1),
    }]
  })
})

const errorRects = computed<CellRect[]>(() => {
  if (!showConflicts.value) return []
  return Array.from(editor.errorCells).flatMap(key => {
    const m = key.match(/r(\d+)c(\d+)/)
    if (!m) return []
    return [{ x: PADDING + Number(m[2]) * CELL_SIZE, y: PADDING + Number(m[1]) * CELL_SIZE }]
  })
})

// Cells the current selection can see — only when the player opts in.
const seenRects = computed<CellRect[]>(() => {
  if (!player.effective.highlightSeen) return []
  return Array.from(editor.cellsSeenBySelection).flatMap(key => {
    const m = key.match(/r(\d+)c(\d+)/)
    if (!m) return []
    return [{ x: PADDING + Number(m[2]) * CELL_SIZE, y: PADDING + Number(m[1]) * CELL_SIZE }]
  })
})

const singleCellBgRects = computed<ColorRect[]>(() => {
  const result: ColorRect[] = []
  // Cells marked as both row and column index get a single combined color
  // instead of the two individual colors stacked on top of each other.
  const rowIndexMarks = editor.singleCellMarks['row_index_cells']
  const colIndexMarks = editor.singleCellMarks['col_index_cells']
  const rowColOverlap = new Set<string>()
  if (rowIndexMarks?.size && colIndexMarks?.size) {
    for (const key of rowIndexMarks) {
      if (colIndexMarks.has(key)) rowColOverlap.add(key)
    }
  }
  const pushRect = (key: string, color: string) => {
    const { row, col } = keyToRowCol(key)
    result.push({ x: PADDING + col * CELL_SIZE, y: PADDING + row * CELL_SIZE, color })
  }
  for (const [type, marks] of Object.entries(editor.singleCellMarks)) {
    const bg = CELL_BACKGROUND_COLORS[type as CellBgKey]
    if (!bg || !marks?.size) continue
    const color = cs.cellBgColor(type as CellBgKey)
    const isIndexType = type === 'row_index_cells' || type === 'col_index_cells'
    for (const key of marks) {
      if (isIndexType && rowColOverlap.has(key)) continue
      // Per-cell setter colors beat the theme tint (min/max: backgroundColor
      // beats the generic `color` for the tint).
      const cellColors = editor.singleCellMarkColors[type]?.[key]
      pushRect(key, cellColors?.backgroundColor ?? cellColors?.color ?? color)
    }
  }
  const overlapColor = CELL_BACKGROUND_COLORS['row_col_index_cells']
  if (overlapColor) {
    for (const key of rowColOverlap) {
      // A cell that is both a row and column index: a setter color on either
      // mark (row first) beats the combined theme tint.
      const setterColor = editor.singleCellMarkColors['row_index_cells']?.[key]?.color
        ?? editor.singleCellMarkColors['col_index_cells']?.[key]?.color
      pushRect(key, setterColor ?? cs.cellBgColor('row_col_index_cells'))
    }
  }
  return result
})
</script>

<template>
  <g>
    <rect
      :x="-margins.left"
      :y="-margins.top"
      :width="totalW + margins.left + margins.right"
      :height="totalH + margins.top + margins.bottom"
      class="grid-canvas"
    />
    <rect
      v-for="(cell, i) in activeCellRects"
      :key="`cell-${i}`"
      :x="cell.x"
      :y="cell.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      class="grid-cell"
    />
    <rect
      v-for="(cr, i) in cellColorRects"
      :key="`cc-${i}`"
      :x="cr.x"
      :y="cr.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      :fill="cr.color"
      :opacity="cr.opacity"
    />
    <rect
      v-for="(cr, i) in pendingColorRects"
      :key="`pc-${i}`"
      :x="cr.x"
      :y="cr.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      :fill="cr.color"
      :opacity="cr.opacity"
    />
    <rect
      v-for="(sr, i) in seenRects"
      :key="`seen-${i}`"
      :x="sr.x"
      :y="sr.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      class="grid-seen"
      opacity="0.08"
    />
    <rect
      v-for="(er, i) in errorRects"
      :key="`err-${i}`"
      :x="er.x"
      :y="er.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      class="grid-error"
      opacity="0.2"
    />
    <!-- Single-cell constraint backgrounds (under grid lines) -->
    <rect
      v-for="(cr, i) in singleCellBgRects"
      :key="`scbg-${i}`"
      :x="cr.x"
      :y="cr.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      :fill="cr.color"
    />
    <component
      :is="layer.component"
      v-for="layer in backgroundLayers"
      :key="layer.id"
    />
  </g>
</template>

<style scoped>
/* Grid surface colors from theme tokens (default = today's hex). Cosmetic cell colors and
   constraint backgrounds keep their own fills; these are only the chrome surfaces. Gated by
   Enable Custom Styles via the applier. */
.grid-canvas { fill: var(--color-grid-canvas); }
.grid-cell { fill: var(--color-grid-cell); }
.grid-seen { fill: var(--color-grid-seen); }
.grid-error { fill: var(--color-grid-error); }
</style>
