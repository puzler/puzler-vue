import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GridBorders from './GridBorders.vue'
import { useGridStore } from '@/stores/grid'

// Regression guard against border-logic inversion. On a standard 9x9, lines
// WITHIN a box are thin and lines ON a box boundary are thick; getting that
// backwards makes the grid look malformed. The counts below are deterministic
// for a 9x9 (3x3 boxes), so they pin the thin/thick split.

let pinia: ReturnType<typeof createPinia>

describe('GridBorders', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const render = () => mount(GridBorders, { global: { plugins: [pinia] } })

  it('draws far more thin (within-box) lines than thick (box-boundary) lines', () => {
    const w = render()
    const thin = w.findAll('g.grid-line-thin line')
    const box = w.findAll('g.grid-line-box line')
    // 9x9: 6 internal thin rows + 6 thin cols, 9 each = 108 thin interior lines.
    expect(thin).toHaveLength(108)
    // The remainder are box boundaries + the outer puzzle edge (36 + 36 = 72).
    expect(box).toHaveLength(72)
    // The whole point: within-box lines dominate, so thin/thick aren't inverted.
    expect(thin.length).toBeGreaterThan(box.length)
  })

  it('reacts to the grid dimensions from the store', () => {
    const grid = useGridStore()
    grid.setDimensions(4, 4)
    const w = render()
    // A 4x4 has 2x2 boxes: fewer interior lines than a 9x9, but still some.
    const total = w.findAll('line').length
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(180)
  })
})
