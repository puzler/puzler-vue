<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { CELL_SIZE, PADDING, cellKey, keyToRowCol } from '@/composables/useGrid'
import { useOuterMargins } from '@/composables/useOuterMargins'
import { CELL_BACKGROUND_COLORS, colorToCss } from '@/types/constraintStyles'
import ConstraintBackgrounds from './ConstraintBackgrounds.vue'

const grid = useGridStore()
const editor = useEditorStore()
const player = usePlayerSettingsStore()
const margins = useOuterMargins()

// Conflict highlighting is a player setting on the solver page; in the setter
// it always shows (it's an authoring aid). `seen` highlighting is opt-in only.
const showConflicts = computed(() => editor.mode !== 'solving' || player.settings.highlightConflicts)
// Solvers can hide the puzzle's built-in (author-placed) cell colours so they
// can recolour freely; the setter always sees its own cosmetics.
const hideCosmeticColors = computed(() => editor.mode === 'solving' && player.settings.hideColors)

const totalW = computed(() => PADDING * 2 + grid.cols * CELL_SIZE)
const totalH = computed(() => PADDING * 2 + grid.rows * CELL_SIZE)

interface CellRect { x: number; y: number }

const activeCellRects = computed<CellRect[]>(() => {
  const rects: CellRect[] = []
  const labels = grid.cellRegionLabelMap
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (labels.get(cellKey(r, c)) !== null)
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
    const color = presets.find(p => p.id === presetId)?.color
    if (!color) return []
    const match = cell.match(/r(\d+)c(\d+)/)!
    return [{ x: PADDING + Number(match[2]) * CELL_SIZE, y: PADDING + Number(match[1]) * CELL_SIZE, color }]
  })
})

const pendingColorRects = computed<ColorRect[]>(() => {
  const color = editor.activeCellColorPreset?.color
  if (!color) return []
  return editor.pendingBrushCells.flatMap(cell => {
    const match = cell.match(/r(\d+)c(\d+)/)!
    return [{ x: PADDING + Number(match[2]) * CELL_SIZE, y: PADDING + Number(match[1]) * CELL_SIZE, color, opacity: 0.55 }]
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
  if (!player.settings.highlightSeen) return []
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
    const bg = CELL_BACKGROUND_COLORS[type]
    if (!bg || !marks?.size) continue
    const color = colorToCss(bg)
    const isIndexType = type === 'row_index_cells' || type === 'col_index_cells'
    for (const key of marks) {
      if (isIndexType && rowColOverlap.has(key)) continue
      pushRect(key, color)
    }
  }
  const overlapColor = CELL_BACKGROUND_COLORS['row_col_index_cells']
  if (overlapColor) {
    for (const key of rowColOverlap) pushRect(key, colorToCss(overlapColor))
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
      fill="#EAE7E0"
    />
    <rect
      v-for="(cell, i) in activeCellRects"
      :key="`cell-${i}`"
      :x="cell.x"
      :y="cell.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      fill="white"
    />
    <rect
      v-for="(cr, i) in cellColorRects"
      :key="`cc-${i}`"
      :x="cr.x"
      :y="cr.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      :fill="cr.color"
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
      fill="#334155"
      opacity="0.08"
    />
    <rect
      v-for="(er, i) in errorRects"
      :key="`err-${i}`"
      :x="er.x"
      :y="er.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      fill="#ef4444"
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
    <ConstraintBackgrounds />
  </g>
</template>
