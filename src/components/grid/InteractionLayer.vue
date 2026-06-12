<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, pointerToCell, pointerToSvgPoint, cellKey } from '@/composables/useGrid'
import { CONSTRAINT_LINE_TYPES, BORDER_CONNECTOR_TYPES, borderKey, cornerKey } from '@/types/constraints'
import type { CosmeticLineData, ConstraintLineData, ThermometerData, ShapeAnchor, BorderConnectorType, ArrowData } from '@/types/constraints'

const props = defineProps<{
  svgRef: SVGSVGElement | null
  selection: Set<string>
}>()

const emit = defineEmits<{
  'update:selection': [sel: Set<string>]
}>()

const grid = useGridStore()
const editor = useEditorStore()

const isDragging = ref(false)
const dragAdditive = ref(false)

const DRAWING_TOOLS = new Set(['cosmetic_line', 'thermometer', 'arrow', ...CONSTRAINT_LINE_TYPES])
const BRUSH_TOOLS = new Set(['cell_color'])
const SINGLE_CELL_TOOLS = new Set(['odd_cells', 'even_cells', 'minimums', 'maximums', 'row_index_cells', 'col_index_cells'])

const isDrawing = computed(() => DRAWING_TOOLS.has(editor.activeTool))
const isBrushing = computed(() => BRUSH_TOOLS.has(editor.activeTool))
const isSingleCellTool = computed(() => SINGLE_CELL_TOOLS.has(editor.activeTool))
const isDotTool = computed(() => BORDER_CONNECTOR_TYPES.has(editor.activeTool))

const DRAW_BUFFER = CELL_SIZE * 0.15

// Brush drag state (local — committed as a single undo step on pointerup)
const brushMode = ref<'paint' | 'erase' | null>(null)
const brushCells = ref<Set<string>>(new Set())

const cursor = computed(() => {
  if (isDrawing.value || isBrushing.value || isSingleCellTool.value || isDotTool.value) return 'crosshair'
  if (editor.activeTool === 'text') return 'text'
  return 'default'
})

function hitCell(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pos = pointerToCell(event, props.svgRef, grid.rows, grid.cols)
  if (!pos) return null
  return cellKey(pos.row, pos.col)
}

function hitCellBuffered(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null

  const rawCol = Math.floor((pt.x - PADDING) / CELL_SIZE)
  const rawRow = Math.floor((pt.y - PADDING) / CELL_SIZE)
  if (rawRow < 0 || rawRow >= grid.rows || rawCol < 0 || rawCol >= grid.cols) return null

  const cellX = PADDING + rawCol * CELL_SIZE
  const cellY = PADDING + rawRow * CELL_SIZE

  if (
    pt.x < cellX + DRAW_BUFFER ||
    pt.x > cellX + CELL_SIZE - DRAW_BUFFER ||
    pt.y < cellY + DRAW_BUFFER ||
    pt.y > cellY + CELL_SIZE - DRAW_BUFFER
  ) {
    return null
  }

  return cellKey(rawRow, rawCol)
}

function findLineAtCell(key: string): string | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== 'cosmetic_line') continue
    const data = inst.data as CosmeticLineData
    if (data.presetId !== editor.activeLinePresetId) continue
    if (data.cells.includes(key)) return inst.id
  }
  return null
}

function findThermoAtCell(key: string): string | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== 'thermometer') continue
    const data = inst.data as ThermometerData
    if (data.root === key || data.edges.some(e => e.from === key || e.to === key)) return inst.id
  }
  return null
}

function findArrowAt(key: string): { id: string; kind: 'bulb' | 'arrow' } | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== 'arrow') continue
    const data = inst.data as ArrowData
    if (data.bulbCells.includes(key)) return { id: inst.id, kind: 'bulb' }
    if (data.arrows.some(p => p.cells.slice(1).includes(key))) return { id: inst.id, kind: 'arrow' }
  }
  return null
}

function findConstraintLineAtCell(key: string): string | null {
  const type = editor.activeTool
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== type) continue
    if ((inst.data as ConstraintLineData).cells.includes(key)) return inst.id
  }
  return null
}

const ANCHOR_THRESHOLD = 0.3

function computeShapeAnchor(event: PointerEvent, cell: string): ShapeAnchor {
  if (!props.svgRef) return 'center'
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return 'center'

  const m = cell.match(/r(\d+)c(\d+)/)!
  const cellX = PADDING + parseInt(m[2]) * CELL_SIZE
  const cellY = PADDING + parseInt(m[1]) * CELL_SIZE

  const fx = (pt.x - cellX) / CELL_SIZE
  const fy = (pt.y - cellY) / CELL_SIZE

  const nearLeft = fx < ANCHOR_THRESHOLD
  const nearRight = fx > 1 - ANCHOR_THRESHOLD
  const nearTop = fy < ANCHOR_THRESHOLD
  const nearBottom = fy > 1 - ANCHOR_THRESHOLD

  if (nearTop && nearLeft) return 'top-left'
  if (nearTop && nearRight) return 'top-right'
  if (nearBottom && nearLeft) return 'bottom-left'
  if (nearBottom && nearRight) return 'bottom-right'
  if (nearTop) return 'top'
  if (nearBottom) return 'bottom'
  if (nearLeft) return 'left'
  if (nearRight) return 'right'
  return 'center'
}

function hasCellColor(key: string): boolean {
  return editor.cosmeticCellColors[key] !== undefined
}

// Max distance from an interior border (fraction of cell size) for a click to hit it
const BORDER_THRESHOLD = 0.25

function hitBorder(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null

  const col = Math.floor((pt.x - PADDING) / CELL_SIZE)
  const row = Math.floor((pt.y - PADDING) / CELL_SIZE)
  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) return null

  const fx = (pt.x - PADDING) / CELL_SIZE - col
  const fy = (pt.y - PADDING) / CELL_SIZE - row

  // Distance to each interior border; outer grid edges have no neighbor
  const candidates: Array<{ dist: number; row: number; col: number }> = []
  if (col > 0) candidates.push({ dist: fx, row, col: col - 1 })
  if (col < grid.cols - 1) candidates.push({ dist: 1 - fx, row, col: col + 1 })
  if (row > 0) candidates.push({ dist: fy, row: row - 1, col })
  if (row < grid.rows - 1) candidates.push({ dist: 1 - fy, row: row + 1, col })

  candidates.sort((a, b) => a.dist - b.dist)
  const best = candidates[0]
  if (!best || best.dist > BORDER_THRESHOLD) return null
  return borderKey(cellKey(row, col), cellKey(best.row, best.col))
}

// Max distance (per axis, fraction of cell size) from an interior corner
// intersection for a click to snap to it
const CORNER_THRESHOLD = 0.3

function hitCorner(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null

  const gx = (pt.x - PADDING) / CELL_SIZE
  const gy = (pt.y - PADDING) / CELL_SIZE
  const col = Math.round(gx)
  const row = Math.round(gy)
  // Interior intersections only — a quadruple touches four cells
  if (row < 1 || row > grid.rows - 1 || col < 1 || col > grid.cols - 1) return null
  if (Math.abs(gx - col) > CORNER_THRESHOLD || Math.abs(gy - row) > CORNER_THRESHOLD) return null
  return cornerKey(row, col)
}

function onPointerDown(event: PointerEvent) {
  if (event.button === 2) return

  if (isDotTool.value) {
    const border = editor.activeTool === 'quadruples' ? hitCorner(event) : hitBorder(event)
    if (!border) {
      editor.selectConnectorDot(null)
    } else if (event.shiftKey) {
      editor.selectConnectorDot(border)
    } else {
      editor.toggleConnectorDot(editor.activeTool as BorderConnectorType, border)
    }
    return
  }

  const key = hitCell(event)
  if (!key) return

  if (editor.activeTool === 'arrow') {
    const hit = findArrowAt(key)
    const mode = event.shiftKey ? 'arrow' : editor.effectiveArrowDrawMode
    if (mode === 'arrow') {
      // From a bulb or arrow cell, drag out a new arrow (or branch)
      if (hit) {
        ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
        isDragging.value = true
        editor.startArrowFrom(hit.id, key)
      }
      return
    }
    if (hit?.kind === 'bulb') {
      // Removing a bulb takes its arrows with it
      editor.removeCosmeticInstance(hit.id)
      return
    }
    if (hit?.kind === 'arrow') {
      editor.removeArrowPath(hit.id, key)
      return
    }
    // Empty cell → draw a new bulb (drag for a multi-cell bulb)
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    editor.startPendingLine(key)
    return
  }

  if (isDrawing.value) {
    if (editor.activeTool === 'thermometer') {
      const thermoId = findThermoAtCell(key)
      if (thermoId !== null) {
        if (event.shiftKey) {
          ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
          isDragging.value = true
          editor.startBranchFromThermo(thermoId, key)
        } else {
          editor.removeCosmeticInstance(thermoId)
        }
        return
      }
    } else if (!event.shiftKey) {
      const existingId = editor.activeTool === 'cosmetic_line'
        ? findLineAtCell(key)
        : findConstraintLineAtCell(key)
      if (existingId !== null) {
        editor.removeCosmeticInstance(existingId)
        return
      }
    }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    editor.startPendingLine(key)
  } else if (isBrushing.value) {
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    brushCells.value = new Set([key])
    brushMode.value = hasCellColor(key) ? 'erase' : 'paint'
    if (brushMode.value === 'paint') editor.setPendingBrushCells([key])
  } else if (isSingleCellTool.value) {
    editor.toggleSingleCellMark(editor.activeTool, key)
  } else if (editor.activeTool === 'text') {
    editor.toggleTextAt(key)
  } else if (editor.activeTool === 'shape') {
    editor.toggleShapeAt(key, computeShapeAnchor(event, key))
  } else {
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    const additive = event.ctrlKey || event.metaKey
    dragAdditive.value = additive
    if (additive) {
      const next = new Set(props.selection)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      emit('update:selection', next)
    } else {
      emit('update:selection', new Set([key]))
    }
  }
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return

  if (isDrawing.value) {
    const key = hitCellBuffered(event)
    if (key) editor.extendPendingLine(key)
  } else if (isBrushing.value) {
    const key = hitCell(event)
    if (!key || brushCells.value.has(key)) return
    brushCells.value = new Set([...brushCells.value, key])
    if (brushMode.value === 'paint') editor.setPendingBrushCells(Array.from(brushCells.value))
  } else {
    const key = hitCell(event)
    if (!key || props.selection.has(key)) return
    emit('update:selection', new Set([...props.selection, key]))
  }
}

function onPointerUp(event: PointerEvent) {
  if (!isDragging.value) return
  ;(event.currentTarget as Element).releasePointerCapture(event.pointerId)
  isDragging.value = false

  if (isDrawing.value) {
    if (
      editor.activeTool === 'thermometer' &&
      editor.pendingBranchThermoId !== null &&
      editor.pendingLineCells.length < 2
    ) {
      // Shift-click without drag → delete this branch/subtree
      const thermoId = editor.pendingBranchThermoId
      const cell = editor.pendingLineCells[0]
      editor.cancelPendingLine()
      if (cell) editor.removeThermoSubtree(thermoId, cell)
    } else {
      editor.commitPendingLine()
    }
  } else if (isBrushing.value) {
    const cells = Array.from(brushCells.value)
    if (editor.activeTool === 'cell_color') {
      editor.setPendingBrushCells([])
      if (brushMode.value === 'paint') editor.paintCells(cells)
      else if (brushMode.value === 'erase') editor.eraseCells(cells)
    }
    brushCells.value = new Set()
    brushMode.value = null
  }
}
</script>

<template>
  <rect
    :x="PADDING"
    :y="PADDING"
    :width="grid.cols * CELL_SIZE"
    :height="grid.rows * CELL_SIZE"
    fill="transparent"
    :style="{ cursor }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  />
</template>
