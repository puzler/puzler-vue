import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FogLayer from './FogLayer.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

// FogLayer paints the fog cover. Both variants render the live derived fog
// set (lights + solver-digit clears) so setting and solving modes agree on
// what reads as cleared; faint adds a bulb glyph per light, opaque adds the
// reveal mask SudokuGrid applies to constraint layers.

let pinia: ReturnType<typeof createPinia>

function render(props: { variant: 'faint' | 'opaque'; maskId?: string }) {
  return mount(FogLayer, { props, global: { plugins: [pinia] } })
}

function cell(value: number) {
  return { value, cornerMarks: [], centerMarks: [], color: null, colors: [] }
}

describe('FogLayer', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    const grid = useGridStore()
    grid.setDimensions(4, 4)
    const editor = useEditorStore()
    editor.activeTypes = new Set(['fog'])
    editor.activeGlobalVariants = new Set(['fog'])
  })

  it('faint: tints every non-light cell and marks lights with a glyph while a fog tool is active', () => {
    const editor = useEditorStore()
    editor.singleCellMarks = { fog_lights: new Set(['r0c0', 'r3c3']) }
    editor.activeTool = 'fog_lights'
    const w = render({ variant: 'faint' })
    expect(w.findAll('rect.grid-fog')).toHaveLength(16 - 2)
    expect(w.findAll('path.fog-light-glyph')).toHaveLength(2)
    // Faint fog is a tint, never opaque. Opacity sits on the group so the
    // dilated rects composite as one flat shape.
    expect(w.get('g[filter]').attributes('opacity')).not.toBe('1')
  })

  it('faint: hides the light glyphs while another tool is active (tint stays)', () => {
    const editor = useEditorStore()
    editor.singleCellMarks = { fog_lights: new Set(['r0c0', 'r3c3']) }
    editor.activeTool = 'digit'
    const w = render({ variant: 'faint' })
    expect(w.findAll('path.fog-light-glyph')).toHaveLength(0)
    expect(w.findAll('rect.grid-fog')).toHaveLength(16 - 2)
  })

  it('faint: reflects solver-digit clears, so mode flips keep cleared cells cleared', () => {
    const editor = useEditorStore()
    // A digit placed while testing in solving mode clears its 3x3 (editor
    // path: every solver digit verifies); the setting-mode tint must agree.
    editor.solverCellStates = { r1c1: cell(5) }
    const w = render({ variant: 'faint' })
    expect(w.findAll('rect.grid-fog')).toHaveLength(16 - 9)
  })

  it('opaque: covers exactly the derived fog set at full opacity', () => {
    const editor = useEditorStore()
    editor.solverCellStates = { r0c0: cell(5) } // editor path: clears its 3x3
    const w = render({ variant: 'opaque' })
    expect(w.findAll('rect.grid-fog')).toHaveLength(16 - 4)
    expect(w.get('g[filter]').attributes('opacity')).toBe('1')
    expect(w.findAll('path.fog-light-glyph')).toHaveLength(0)
  })

  it('feathers the fog edge through a dilate-blur filter, clipped to the grid bounds', () => {
    const w = render({ variant: 'opaque' })
    const filter = w.get('filter')
    expect(filter.find('feMorphology').attributes('operator')).toBe('dilate')
    expect(filter.find('feGaussianBlur').exists()).toBe(true)
    // The fog group references this instance's own filter id, and clips the
    // filtered result to the grid bounds so the outer edge stays clean.
    const group = w.get('g[filter]')
    expect(group.attributes('filter')).toBe(`url(#${filter.attributes('id')})`)
    expect(group.attributes('clip-path')).toBe(`url(#${filter.attributes('id')}-bounds)`)
    expect(w.get(`clipPath[id="${filter.attributes('id')}-bounds"]`).findAll('rect')).toHaveLength(1)
  })

  it('opaque: emits the fog mask (white base + feathered black fog) under maskId', () => {
    const editor = useEditorStore()
    editor.solverCellStates = { r0c0: cell(5) } // clears its 3x3 -> 12 fogged cells
    const w = render({ variant: 'opaque', maskId: 'fog-mask-test' })
    const mask = w.get('mask#fog-mask-test')
    expect(mask.find('rect[fill="white"]').exists()).toBe(true)
    expect(mask.findAll('rect[fill="black"]')).toHaveLength(16 - 4)
    // The black shape runs through the same feather filter and bounds clip as
    // the fog fill, so masked graphics fade exactly as the fog fades in.
    const filterId = w.get('filter').attributes('id')
    expect(mask.get('g').attributes('filter')).toBe(`url(#${filterId})`)
    expect(mask.get('g').attributes('clip-path')).toBe(`url(#${filterId}-bounds)`)
  })

  it('omits the mask without a maskId', () => {
    const w = render({ variant: 'opaque' })
    expect(w.find('mask').exists()).toBe(false)
  })
})
