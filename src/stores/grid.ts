import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { computeStandardBoxes, cellKey } from '@/composables/useGrid'
import type { BoxRegion } from '@/types/grid'

export const useGridStore = defineStore('grid', () => {
  const rows = ref(9)
  const cols = ref(9)
  const customBoxLayout = ref<BoxRegion[] | null>(null)

  const boxes = computed<BoxRegion[]>(() => {
    if (customBoxLayout.value) return customBoxLayout.value
    return computeStandardBoxes(rows.value, cols.value) ?? []
  })

  const cellBoxMap = computed(() => {
    const map = new Map<string, number>()
    boxes.value.forEach((box, i) => {
      box.cells.forEach((key) => map.set(key, i))
    })
    return map
  })

  function setDimensions(r: number, c: number) {
    rows.value = r
    cols.value = c
    customBoxLayout.value = null
  }

  function setCustomBoxLayout(layout: BoxRegion[]) {
    customBoxLayout.value = layout
  }

  function areSameBox(keyA: string, keyB: string): boolean {
    const a = cellBoxMap.value.get(keyA)
    const b = cellBoxMap.value.get(keyB)
    return a !== undefined && a === b
  }

  function allCellKeys(): string[] {
    const keys: string[] = []
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        keys.push(cellKey(r, c))
      }
    }
    return keys
  }

  return { rows, cols, boxes, cellBoxMap, setDimensions, setCustomBoxLayout, areSameBox, allCellKeys }
})
