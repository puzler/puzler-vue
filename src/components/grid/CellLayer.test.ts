import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CellLayer from './CellLayer.vue'
import GridCell from './GridCell.vue'
import { useGridStore } from '@/stores/grid'
import { useColorPaletteStore } from '@/stores/colorPalette'
import type { CellState } from '@/types/grid'

// Use ONE pinia for both the test's store mutations and the mounted component so
// they share state (the repo's usual two-createPinia pattern would split them).
let pinia: ReturnType<typeof createPinia>

const cell = (o: Partial<CellState> = {}): CellState => ({
  value: null, cornerMarks: [], centerMarks: [], color: null, colors: [], ...o,
})

describe('CellLayer', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const render = (cellStates: Record<string, CellState> = {}) =>
    mount(CellLayer, { props: { cellStates }, global: { plugins: [pinia] } })

  it('renders exactly one GridCell per grid cell', () => {
    const grid = useGridStore()
    expect(render().findAllComponents(GridCell)).toHaveLength(grid.rows * grid.cols)
  })

  it('resolves applied palette colors to fills and drops stale/unknown keys', () => {
    const palette = useColorPaletteStore()
    palette.setColor('A', 'rgb(255,0,0)')
    const first = render({ r0c0: cell({ colors: ['A', 'ghost'] }) }).findAllComponents(GridCell)[0]
    // 'A' resolves to a fill; 'ghost' is not in the palette, so it is dropped.
    expect(first.props('fills')).toHaveLength(1)
    expect(first.props('fills')?.[0]).toBeTruthy()
  })

  it('passes the legacy cosmetic color straight through to the cell', () => {
    const first = render({ r0c0: cell({ color: '#abcdef' }) }).findAllComponents(GridCell)[0]
    expect(first.props('color')).toBe('#abcdef')
  })
})
