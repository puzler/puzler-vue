// Selection-derived state for the player page's math helpers: the killer cage
// helper (combos for the cage containing the selection) and the selected-cells
// sum calculator. Pure computeds over the editor/grid stores — live behavior
// falls out of reactivity; rendering is gated by player settings in the
// components.
//
// Fog of War discipline (three leak channels, all guarded):
//   - values: fogged givens never feed candidates or the cage auto-filter;
//   - cage identity: a cage with ANY fogged cell never matches (acknowledging
//     it would reveal its existence, true size and sum);
//   - linkage: distinctness/seen checks use the fog-safe sees predicate, so a
//     hidden cage or line can never tighten a sum readout.

import { computed, type ComputedRef } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { keyToRowCol } from '@/composables/useGrid'
import { enumerateCombos, comboStats, type Combo, type ComboStats } from '@/utils/sumCombinations'
import { selectionSumBounds, type SumBounds, type SumCell } from '@/utils/selectionSum'
import type { KillerCageData } from '@/types/constraints'

// Above this digit range combo enumeration blows up; helpers hide entirely.
export const HELPER_MAX_DIGIT_RANGE = 16

export interface SelectedCage {
  instanceId: string
  // Persistence key for strikes. Instance ids are regenerated on every puzzle
  // load, so strikes key on the cage's stable identity instead: its (sorted)
  // cell set plus clued sum, both straight from the document.
  strikeKey: string
  cells: string[]
  sum: number | null
}

function cageStrikeKey(cells: string[], sum: number | null): string {
  return `${[...cells].sort().join('|')}#${sum ?? ''}`
}

export interface KillerCageHelperState {
  cage: ComputedRef<SelectedCage | null>
  combos: ComputedRef<Combo[]>
  truncated: ComputedRef<boolean>
  autoRemovedCount: ComputedRef<number>
  struckKeys: ComputedRef<Set<string>>
  stats: ComputedRef<ComboStats>
  toggleStrike: (key: string) => void
  clearStrikes: () => void
}

export interface SelectionCalculation {
  count: number
  bounds: SumBounds | null // null = no valid sum (contradiction or letters)
}

export function useHelpersAvailable(): ComputedRef<boolean> {
  const grid = useGridStore()
  return computed(() => grid.effectiveDigitRange <= HELPER_MAX_DIGIT_RANGE)
}

// The fogged-cell set when fog concealment is live (player page), else null.
function currentFog(editor: ReturnType<typeof useEditorStore>): Set<string> | null {
  return editor.fogEnabled && editor.mode === 'solving' && editor.foggedCells.size > 0
    ? editor.foggedCells
    : null
}

// The single killer cage containing every selected cell, if any. Overlapping
// matches tie-break: exact cell-set match, then fewest cells, then placement
// order — deterministic either way.
export function useSelectedKillerCage(): ComputedRef<SelectedCage | null> {
  const editor = useEditorStore()
  return computed<SelectedCage | null>(() => {
    const selection = editor.selection
    if (selection.size === 0) return null
    const fogged = currentFog(editor)
    let best: { instance: SelectedCage; exact: boolean } | null = null
    for (const instance of editor.cosmeticInstances) {
      if (instance.type !== 'killer_cage') continue
      const data = instance.data as KillerCageData
      if (data.cells.length < selection.size) continue
      const cellSet = new Set(data.cells)
      let containsAll = true
      for (const key of selection) {
        if (!cellSet.has(key)) {
          containsAll = false
          break
        }
      }
      if (!containsAll) continue
      // A partially fogged cage must not be acknowledged at all.
      if (fogged && data.cells.some((key) => fogged.has(key))) continue
      const exact = data.cells.length === selection.size
      if (
        best === null ||
        (exact && !best.exact) ||
        (exact === best.exact && data.cells.length < best.instance.cells.length)
      ) {
        best = {
          instance: {
            instanceId: instance.id,
            strikeKey: cageStrikeKey(data.cells, data.sum ?? null),
            cells: [...data.cells],
            sum: data.sum ?? null,
          },
          exact,
        }
      }
    }
    return best?.instance ?? null
  })
}

// Distinct numeric digits already known inside the cage: unfogged givens plus
// player-placed numbers (letters ignored). These auto-filter the combo list.
function placedDigitsInCage(editor: ReturnType<typeof useEditorStore>, cells: string[]): number[] {
  const fogged = currentFog(editor)
  const placed = new Set<number>()
  for (const key of cells) {
    const given = editor.givenDigits[key]
    if (given !== undefined) {
      if (!fogged?.has(key)) placed.add(given)
      continue
    }
    const value = editor.solverCellStates[key]?.value
    if (typeof value === 'number') placed.add(value)
  }
  return [...placed]
}

export function useKillerCageHelper(): KillerCageHelperState {
  const editor = useEditorStore()
  const grid = useGridStore()
  const cage = useSelectedKillerCage()

  const enumerated = computed(() => {
    const c = cage.value
    if (!c) return { combos: [], truncated: false }
    return enumerateCombos(grid.effectiveDigitRange, { size: c.cells.length, total: c.sum })
  })

  const combos = computed<Combo[]>(() => {
    const c = cage.value
    if (!c) return []
    const placed = placedDigitsInCage(editor, c.cells)
    if (placed.length === 0) return enumerated.value.combos
    return enumerated.value.combos.filter((combo) => placed.every((d) => combo.digits.includes(d)))
  })

  const truncated = computed(() => enumerated.value.truncated)
  const autoRemovedCount = computed(() => enumerated.value.combos.length - combos.value.length)
  const struckKeys = computed<Set<string>>(() => {
    const c = cage.value
    return new Set(c ? (editor.eliminatedCageCombos[c.strikeKey] ?? []) : [])
  })
  const stats = computed<ComboStats>(() => comboStats(combos.value, struckKeys.value, grid.effectiveDigitRange))

  const toggleStrike = (key: string) => {
    const c = cage.value
    if (c) editor.toggleCageComboStrike(c.strikeKey, key)
  }
  const clearStrikes = () => {
    const c = cage.value
    if (c) editor.clearCageComboStrikes(c.strikeKey)
  }

  return { cage, combos, truncated, autoRemovedCount, struckKeys, stats, toggleStrike, clearStrikes }
}

// Possible sum of the current selection. Null result = nothing to show
// (fewer than 2 cells, or a selected cell is fogged — a readout over hidden
// cells would leak their contents). `bounds: null` = shown as "No valid sum".
export function useSelectionCalculator(): ComputedRef<SelectionCalculation | null> {
  const editor = useEditorStore()
  const grid = useGridStore()
  return computed<SelectionCalculation | null>(() => {
    const keys = [...editor.selection].filter((key) => !grid.isVoid(key))
    if (keys.length < 2) return null
    const fogged = currentFog(editor)
    if (fogged && keys.some((key) => fogged.has(key))) return null

    const { seesRCFogSafe } = editor.cellVisibility
    const coords = keys.map((key) => keyToRowCol(key))
    const selected = new Set(keys)
    const range = grid.effectiveDigitRange

    const cells: SumCell[] = keys.map((key, i) => {
      const given = editor.givenDigits[key]
      if (given !== undefined) return { key, candidates: [given] }
      const state = editor.solverCellStates[key]
      if (typeof state?.value === 'number') return { key, candidates: [state.value] }
      if (typeof state?.value === 'string') return { key, candidates: [] } // letters have no sum
      const marks = (state?.centerMarks ?? []).filter(
        (m): m is number => typeof m === 'number' && m >= 1 && m <= range,
      )
      let candidates = marks.length > 0 ? [...new Set(marks)] : Array.from({ length: range }, (_, d) => d + 1)
      // Digits already visible to this cell are gone (fog-safe: hidden givens
      // and hidden-constraint links never count). Selected cells are excluded
      // here — distinctness pairs below handle them exactly.
      const { row, col } = coords[i]
      for (const filled of editor.filledDigitCells) {
        if (typeof filled.digit !== 'number' || selected.has(filled.key)) continue
        if (!candidates.includes(filled.digit)) continue
        if (seesRCFogSafe(key, row, col, filled.key, filled.row, filled.col)) {
          candidates = candidates.filter((d) => d !== filled.digit)
        }
      }
      return { key, candidates }
    })

    const seesPair = (i: number, j: number) =>
      seesRCFogSafe(keys[i], coords[i].row, coords[i].col, keys[j], coords[j].row, coords[j].col)

    return { count: keys.length, bounds: selectionSumBounds(cells, seesPair) }
  })
}
