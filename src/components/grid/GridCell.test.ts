import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GridCell from './GridCell.vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'

// GridCell paints a single cell's background. It is pure (props in, SVG out) and
// was almost untested, yet it owns the multi-color pie-wedge geometry that broke
// before — so pin each rendering branch.

describe('GridCell', () => {
  it('paints a single opaque player color as one full-cell rect', () => {
    const w = mount(GridCell, { props: { row: 0, col: 0, fills: ['rgba(255,0,0,1)'] } })
    const rects = w.findAll('rect')
    expect(rects).toHaveLength(1)
    expect(rects[0].attributes('fill')).toBe('rgba(255,0,0,1)')
    expect(w.findAll('path')).toHaveLength(0)
  })

  it('positions the cell from row/col using the shared grid geometry', () => {
    const w = mount(GridCell, { props: { row: 1, col: 2, color: '#abcabc' } })
    const rect = w.get('rect')
    expect(rect.attributes('x')).toBe(String(PADDING + 2 * CELL_SIZE))
    expect(rect.attributes('y')).toBe(String(PADDING + 1 * CELL_SIZE))
  })

  it('draws one pie wedge per color when several are applied', () => {
    const w = mount(GridCell, {
      props: { row: 0, col: 0, fills: ['rgba(255,0,0,1)', 'rgba(0,0,255,1)', 'rgba(0,255,0,1)'] },
    })
    expect(w.findAll('path')).toHaveLength(3)
    expect(w.findAll('rect')).toHaveLength(0)
  })

  it('keeps a wedge for a transparent (null) color but paints nothing into it', () => {
    const w = mount(GridCell, { props: { row: 0, col: 0, fills: ['rgba(255,0,0,1)', null] } })
    const paths = w.findAll('path')
    expect(paths).toHaveLength(2)
    expect(paths[1].attributes('fill')).toBe('transparent')
  })

  it('falls back to the legacy single cosmetic color when no player fills exist', () => {
    const w = mount(GridCell, { props: { row: 0, col: 0, color: '#123456' } })
    expect(w.get('rect').attributes('fill')).toBe('#123456')
  })

  it('renders nothing when the cell has neither fills nor a color', () => {
    const w = mount(GridCell, { props: { row: 0, col: 0 } })
    expect(w.findAll('rect')).toHaveLength(0)
    expect(w.findAll('path')).toHaveLength(0)
  })
})
