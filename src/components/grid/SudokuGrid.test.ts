import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SudokuGrid from './SudokuGrid.vue'
import InteractionLayer from './InteractionLayer.vue'

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
