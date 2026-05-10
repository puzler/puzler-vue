<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, pointerToCell, pointerToSvgPoint, cellKey } from '@/composables/useGrid'
import type { CosmeticLineData } from '@/types/constraints'

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

// Tools that build an ordered cell path rather than a selection set
const DRAWING_TOOLS = new Set(['cosmetic_line'])
const isDrawing = computed(() => DRAWING_TOOLS.has(editor.activeTool))

// When drawing a line, the pointer must be this many SVG units inside a cell
// boundary before that cell is added to the path. Prevents accidental diagonal
// neighbours from being picked up when the pointer just clips a corner.
const DRAW_BUFFER = CELL_SIZE * 0.15

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

function onPointerDown(event: PointerEvent) {
  if (event.button === 2) return
  const key = hitCell(event)
  if (!key) return

  if (isDrawing.value) {
    if (!event.shiftKey) {
      const existingId = findLineAtCell(key)
      if (existingId !== null) {
        editor.removeCosmeticInstance(existingId)
        return
      }
    }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    editor.startPendingLine(key)
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
    editor.commitPendingLine()
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
    :style="{ cursor: isDrawing ? 'crosshair' : 'default' }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  />
</template>
