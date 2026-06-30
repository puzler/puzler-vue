import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlayerDesktopLayout from './PlayerDesktopLayout.vue'
import InteractionLayer from '@/components/grid/InteractionLayer.vue'

// Play page regression guard. The grid is the core of the solver, so prove the
// page's composition actually mounts an interactive grid (the real input layer),
// not just that SudokuGrid exists. This is what would have caught the grid going
// unselectable: the layout renders <SudokuGrid> WITHOUT an `interactive` prop,
// relying on it defaulting to true.

describe('PlayerDesktopLayout grid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function render() {
    return mount(PlayerDesktopLayout, {
      props: {
        title: 'Test puzzle',
        author: null,
        authorName: null,
        rules: '',
        showTimer: true,
        elapsedLabel: '0:00',
        paused: false,
        collaborationEnabled: false,
      },
      // Keep SudokuGrid real (we assert on its input layer); the side panel is
      // unrelated to grid input and pulls in heavy deps, so stub it out.
      global: {
        plugins: [createPinia()],
        stubs: { PlayerSidePanel: true, PausedOverlay: true },
      },
    })
  }

  it('mounts an interactive grid (the input layer is present)', () => {
    expect(render().findComponent(InteractionLayer).exists()).toBe(true)
  })
})
