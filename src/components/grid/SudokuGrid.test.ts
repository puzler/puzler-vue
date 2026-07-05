import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SudokuGrid from './SudokuGrid.vue'
import InteractionLayer from './InteractionLayer.vue'
import FogLayer from './FogLayer.vue'
import { useEditorStore } from '@/stores/editor'

// Regression guard for the grid's input layer.
//
// `interactive` is a Boolean prop, and Vue casts an ABSENT Boolean prop to
// `false` (not `undefined`). The grid must still render its InteractionLayer
// when a consumer omits the prop, which is what every interactive page does
// (the player and the editor). If the prop ever loses its explicit `true`
// default, omitting it silently drops all pointer input and the grid becomes
// unselectable on those pages, so these tests pin the default behaviour.

function render(props: Record<string, unknown> = {}) {
  return shallowMount(SudokuGrid, {
    props: { mode: 'edit', givenDigits: {}, selection: new Set<string>(), ...props },
    global: { plugins: [createPinia()] },
  })
}

describe('SudokuGrid interactivity', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the interaction layer when `interactive` is omitted (the player/editor default)', () => {
    expect(render().findComponent(InteractionLayer).exists()).toBe(true)
  })

  it('renders the interaction layer when `interactive` is explicitly true', () => {
    expect(render({ interactive: true }).findComponent(InteractionLayer).exists()).toBe(true)
  })

  it('drops the interaction layer only when `interactive` is explicitly false (static thumbnail)', () => {
    expect(render({ interactive: false }).findComponent(InteractionLayer).exists()).toBe(false)
  })
})

// Fog variant selection: the interactive setter view gets the faint overlay;
// solving mode and EVERY static render get opaque fog. A static render falling
// back to faint would leak hidden constraints on thumbnails/previews.
describe('SudokuGrid fog variant', () => {
  function renderWithFog(props: Record<string, unknown> = {}, setup?: (editor: ReturnType<typeof useEditorStore>) => void) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const editor = useEditorStore()
    editor.activeGlobalVariants = new Set(['fog'])
    setup?.(editor)
    const w = shallowMount(SudokuGrid, {
      props: { mode: 'edit', givenDigits: {}, selection: new Set<string>(), ...props },
      global: { plugins: [pinia] },
    })
    return w
  }

  it('renders no fog layer when fog is disabled', () => {
    setActivePinia(createPinia())
    expect(render().findComponent(FogLayer).exists()).toBe(false)
  })

  it('renders the faint variant in the interactive setter view', () => {
    const fog = renderWithFog().findComponent(FogLayer)
    expect(fog.props('variant')).toBe('faint')
  })

  it('renders the opaque variant in solving mode', () => {
    const fog = renderWithFog({}, (editor) => { editor.mode = 'solving' }).findComponent(FogLayer)
    expect(fog.props('variant')).toBe('opaque')
    expect(fog.props('maskId')).toBeTruthy()
  })

  it('renders the opaque variant for static renders even in setting mode', () => {
    const fog = renderWithFog({ interactive: false }).findComponent(FogLayer)
    expect(fog.props('variant')).toBe('opaque')
  })
})
