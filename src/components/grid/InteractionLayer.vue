<script setup lang="ts">
import { ref } from 'vue'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING, pointerToCell, cellKey } from '@/composables/useGrid'

const props = defineProps<{
  svgRef: SVGSVGElement | null
  selection: Set<string>
}>()

const emit = defineEmits<{
  'update:selection': [sel: Set<string>]
}>()

const grid = useGridStore()

const isDragging = ref(false)
const dragAdditive = ref(false)

function hitCell(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pos = pointerToCell(event, props.svgRef, grid.rows, grid.cols)
  if (!pos) return null
  return cellKey(pos.row, pos.col)
}

function onPointerDown(event: PointerEvent) {
  if (event.button === 2) return
  const key = hitCell(event)
  if (!key) return
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

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  const key = hitCell(event)
  if (!key) return
  if (dragAdditive.value) {
    if (props.selection.has(key)) return
    emit('update:selection', new Set([...props.selection, key]))
  } else {
    if (props.selection.has(key)) return
    emit('update:selection', new Set([...props.selection, key]))
  }
}

function onPointerUp(event: PointerEvent) {
  ;(event.currentTarget as Element).releasePointerCapture(event.pointerId)
  isDragging.value = false
}
</script>

<template>
  <rect
    :x="PADDING"
    :y="PADDING"
    :width="grid.cols * CELL_SIZE"
    :height="grid.rows * CELL_SIZE"
    fill="transparent"
    style="cursor: default"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  />
</template>
