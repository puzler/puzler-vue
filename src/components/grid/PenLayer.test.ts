import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PenLayer from './PenLayer.vue'
import { useEditorStore } from '@/stores/editor'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'

let pinia: ReturnType<typeof createPinia>

describe('PenLayer', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const render = () => mount(PenLayer, { global: { plugins: [pinia] } })

  it('renders nothing for an empty pen state', () => {
    const w = render()
    expect(w.findAll('line')).toHaveLength(0)
    expect(w.findAll('circle')).toHaveLength(0)
    expect(w.findAll('polyline')).toHaveLength(0)
  })

  it('renders a committed center segment between the two cell centers', () => {
    const editor = useEditorStore()
    editor.penState.segments['r0c0-r0c1'] = '1'
    const w = render()
    const line = w.find('line')
    expect(line.exists()).toBe(true)
    expect(Number(line.attributes('x1'))).toBe(PADDING + CELL_SIZE / 2)
    expect(Number(line.attributes('y1'))).toBe(PADDING + CELL_SIZE / 2)
    expect(Number(line.attributes('x2'))).toBe(PADDING + CELL_SIZE * 1.5)
    expect(line.attributes('stroke')).toBe(useColorPaletteStore().swatchForKey('1'))
  })

  it('renders an X as two lines and an O as a circle', () => {
    const editor = useEditorStore()
    editor.penState.cellMarks['r1c1'] = { shape: 'x', color: '2' }
    editor.penState.cellMarks['r2c2'] = { shape: 'o', color: '3' }
    const w = render()
    expect(w.findAll('line')).toHaveLength(2) // the X
    expect(w.findAll('circle')).toHaveLength(1) // the O
  })

  it('renders an edge mark as a small X at the edge midpoint', () => {
    const editor = useEditorStore()
    editor.penState.edgeMarks['k0c0-k0c1'] = '1'
    const w = render()
    const lines = w.findAll('line')
    expect(lines).toHaveLength(2)
    // Both strokes cross at the edge midpoint (top edge of r0c0).
    const x = (Number(lines[0].attributes('x1')) + Number(lines[0].attributes('x2'))) / 2
    const y = (Number(lines[0].attributes('y1')) + Number(lines[0].attributes('y2'))) / 2
    expect(x).toBe(PADDING + CELL_SIZE / 2)
    expect(y).toBe(PADDING)
  })

  it('previews a pending draw stroke in the selected color', () => {
    const editor = useEditorStore()
    editor.beginPenStroke('r0c0', 'center')
    editor.extendPenStroke('r0c1')
    const w = render()
    const poly = w.find('polyline')
    expect(poly.exists()).toBe(true)
    expect(poly.attributes('stroke-dasharray')).toBeUndefined()
    expect(poly.attributes('stroke')).toBe(useColorPaletteStore().swatchForKey('1'))
  })

  it('previews a pending erase stroke dashed in the error color', () => {
    const editor = useEditorStore()
    editor.penState.segments['r0c0-r0c1'] = '1'
    editor.beginPenStroke('r0c0', 'center')
    editor.extendPenStroke('r0c1') // first segment exists -> erase pass
    const w = render()
    // The committed segment renders as a <line>; the preview is the polyline.
    const poly = w.find('polyline')
    expect(poly.exists()).toBe(true)
    expect(poly.attributes('stroke-dasharray')).toBeTruthy()
    expect(poly.attributes('stroke')).toBe('var(--color-grid-error)')
  })
})
