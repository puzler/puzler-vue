import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cellKey } from '@/composables/useGrid'

function dimensionsForSize(size: number): { width: number; height: number } {
  const factors: number[] = []
  for (let i = 1; i <= Math.floor(Math.sqrt(size)); i++) {
    if (size % i === 0) {
      factors.push(i)
      if (size / i !== i) factors.push(size / i)
    }
  }
  factors.sort((a, b) => a - b)
  return {
    width: factors[Math.ceil((factors.length - 1) / 2)],
    height: factors[Math.floor((factors.length - 1) / 2)],
  }
}

function regionsForSize(size: number): number[][] {
  const { height, width } = dimensionsForSize(size)
  const regionsPerRow = size / width
  return Array.from(
    { length: size },
    (_, row) => Array.from(
      { length: size },
      (_, column) => Math.floor(row / height) * regionsPerRow + Math.floor(column / width),
    ),
  )
}

function boxIndexToLabel(index: number): string {
  if (index < 9) return String(index + 1)
  const code = 'A'.charCodeAt(0) + (index - 9)
  return code <= 90 ? String.fromCharCode(code) : '?'
}

export const useGridStore = defineStore('grid', () => {
  const rows = ref(9)
  const cols = ref(9)

  // null = all cells use standard default labels
  // Record: per-cell override — string label ('0'–'9', 'A'–'Z') or null (excluded from regions)
  const customCellRegions = ref<Record<string, string | null> | null>(null)

  const cellRegionLabelMap = computed<Map<string, string | null>>(() => {
    const stdRegions = rows.value === cols.value ? regionsForSize(rows.value) : null
    const map = new Map<string, string | null>()
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        const key = cellKey(r, c)
        if (customCellRegions.value !== null && key in customCellRegions.value) {
          map.set(key, customCellRegions.value[key])
        } else {
          map.set(key, stdRegions ? boxIndexToLabel(stdRegions[r][c]) : null)
        }
      }
    }
    return map
  })

  // 'thin'  — same region (both non-null, same label)
  // 'thick' — different regions (both non-null, different labels)
  // 'outer' — one cell is in a region, the other is null (treated like the puzzle outer border)
  // 'none'  — both cells have no region
  function regionBorderType(keyA: string, keyB: string): 'thin' | 'thick' | 'outer' | 'none' {
    const a = cellRegionLabelMap.value.get(keyA)
    const b = cellRegionLabelMap.value.get(keyB)
    if (a === null && b === null) return 'none'
    if (a === null || b === null) return 'outer'
    if (a === b) return 'thin'
    return 'thick'
  }

  function areSameRegion(keyA: string, keyB: string): boolean {
    return regionBorderType(keyA, keyB) === 'thin'
  }

  function setCustomCellRegions(regions: Record<string, string | null> | null) {
    customCellRegions.value = regions
  }

  function setDimensions(r: number, c: number) {
    rows.value = r
    cols.value = c
    customCellRegions.value = null
  }

  function allCellKeys(): string[] {
    const keys: string[] = []
    for (let r = 0; r < rows.value; r++)
      for (let c = 0; c < cols.value; c++)
        keys.push(cellKey(r, c))
    return keys
  }

  return {
    rows,
    cols,
    customCellRegions,
    cellRegionLabelMap,
    regionBorderType,
    areSameRegion,
    setCustomCellRegions,
    setDimensions,
    allCellKeys,
  }
})
