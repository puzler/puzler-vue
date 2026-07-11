import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cellKey, defaultDigitRange } from '@/composables/useGrid'

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

export function regionsForSize(size: number): number[][] {
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

export function boxIndexToLabel(index: number): string {
  if (index < 9) return String(index + 1)
  if (index < 35) return String.fromCharCode('A'.charCodeAt(0) + (index - 9))
  if (index < 61) return String.fromCharCode('a'.charCodeAt(0) + (index - 35))
  return '?'
}

export const useGridStore = defineStore('grid', () => {
  const rows = ref(9)
  const cols = ref(9)

  // The value range digits run over (1..N). null = automatic: the long side
  // of the grid up to 9, then 9 (see defaultDigitRange — gattai boards use
  // ordinary digits, and the solver's masks cap ranges at 16). An explicit
  // value serves puzzles whose digits don't span the grid (two 6×6 sudokus
  // conjoined on a 10×10 use 1-6) or larger-than-9 ranges (up to 16).
  const digits = ref<number | null>(null)
  const effectiveDigitRange = computed(() => digits.value ?? defaultDigitRange(rows.value, cols.value))

  // Bumped on every setDimensions call (even same-size) — see setDimensions.
  const layoutVersion = ref(0)

  // null = all cells use standard default labels
  // Record: per-cell override — the SORTED list of region labels ('0'–'9',
  // 'A'–'Z', 'a'–'z') the cell belongs to. Cells may belong to several regions
  // (conjoined grids overlap their boxes); an empty list excludes the cell
  // from regions entirely.
  const customCellRegions = ref<Record<string, string[]> | null>(null)

  const cellRegionLabelMap = computed<Map<string, string[]>>(() => {
    const stdRegions = rows.value === cols.value ? regionsForSize(rows.value) : null
    const map = new Map<string, string[]>()
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        const key = cellKey(r, c)
        if (customCellRegions.value !== null && key in customCellRegions.value) {
          map.set(key, customCellRegions.value[key])
        } else {
          map.set(key, stdRegions ? [boxIndexToLabel(stdRegions[r][c])] : [])
        }
      }
    }
    return map
  })

  // 'thin'  — identical label sets (both non-empty)
  // 'thick' — differing label sets (a region starts or ends here; through an
  //           overlap this draws BOTH regions' outlines)
  // 'outer' — one cell has regions, the other none (treated like the puzzle edge)
  // 'none'  — neither cell has a region
  function regionBorderType(keyA: string, keyB: string): 'thin' | 'thick' | 'outer' | 'none' {
    const a = cellRegionLabelMap.value.get(keyA) ?? []
    const b = cellRegionLabelMap.value.get(keyB) ?? []
    if (a.length === 0 && b.length === 0) return 'none'
    if (a.length === 0 || b.length === 0) return 'outer'
    if (a.length === b.length && a.every((label, i) => label === b[i])) return 'thin'
    return 'thick'
  }

  // Two cells share region-uniqueness when ANY region contains both.
  function areSameRegion(keyA: string, keyB: string): boolean {
    const a = cellRegionLabelMap.value.get(keyA) ?? []
    if (a.length === 0) return false
    const b = cellRegionLabelMap.value.get(keyB) ?? []
    return a.some((label) => b.includes(label))
  }

  // Void cells: on a grid where regions exist, cells belonging to none are
  // dead space (unselectable, unfillable, ignored by the solver and fog).
  // A grid with NO regions at all stays fully live — plain Latin-rectangle
  // boards have no layout and no holes.
  const hasRegions = computed(() => {
    for (const labels of cellRegionLabelMap.value.values()) {
      if (labels.length > 0) return true
    }
    return false
  })

  const voidCells = computed<Set<string>>(() => {
    const voids = new Set<string>()
    if (!hasRegions.value) return voids
    for (const [key, labels] of cellRegionLabelMap.value) {
      if (labels.length === 0) voids.add(key)
    }
    return voids
  })

  function isVoid(key: string): boolean {
    return voidCells.value.has(key)
  }

  function setCustomCellRegions(regions: Record<string, string[]> | null) {
    customCellRegions.value = regions
  }

  function setDigits(n: number | null) {
    digits.value = n
  }

  function setDimensions(r: number, c: number) {
    rows.value = r
    cols.value = c
    customCellRegions.value = null
    digits.value = null
    // Every puzzle load / new grid passes through here. Bump even when the
    // dimensions are unchanged so watchers (the zoom viewport's reset) can
    // tell "a different same-size board" from "nothing happened".
    layoutVersion.value++
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
    digits,
    effectiveDigitRange,
    layoutVersion,
    setDigits,
    customCellRegions,
    cellRegionLabelMap,
    regionBorderType,
    areSameRegion,
    hasRegions,
    voidCells,
    isVoid,
    setCustomCellRegions,
    setDimensions,
    allCellKeys,
  }
})
