<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, pointerToCell, pointerToSvgPoint, cellKey } from '@/composables/useGrid'
import { CONSTRAINT_LINE_TYPES } from '@/types/constraints'
import type { CosmeticLineData, ConstraintLineData, ThermometerData, ShapeAnchor } from '@/types/constraints'

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

const DRAWING_TOOLS = new Set(['cosmetic_line', 'thermometer', ...CONSTRAINT_LINE_TYPES])
const BRUSH_TOOLS = new Set(['cell_color'])

const isDrawing = computed(() => DRAWING_TOOLS.has(editor.activeTool))
const isBrushing = computed(() => BRUSH_TOOLS.has(editor.activeTool))

const DRAW_BUFFER = CELL_SIZE * 0.15

// Brush drag state (local — committed as a single undo step on pointerup)
const brushMode = ref<'paint' | 'erase' | null>(null)
const brushCells = ref<Set<string>>(new Set())

const cursor = computed(() => {
  if (isDrawing.value || isBrushing.value) return 'crosshair'
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

function onPointerDown(event: PointerEvent) {
  if (event.button === 2) return
  const key = hitCell(event)
  if (!key) return

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
