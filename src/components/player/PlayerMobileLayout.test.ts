import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlayerMobileLayout from './PlayerMobileLayout.vue'
import InteractionLayer from '@/components/grid/InteractionLayer.vue'

// Mobile play-page regression guard, mirroring PlayerDesktopLayout.test.ts. The
// layout renders <SudokuGrid> WITHOUT an `interactive` prop, relying on it
// defaulting to true; prove the composition still mounts a real, interactive grid
// so a future component change can't silently make the mobile grid unselectable.

describe('PlayerMobileLayout grid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function render() {
    return mount(PlayerMobileLayout, {
      props: {
        title: 'Test puzzle',
        author: null,
        authorName: null,
        showTimer: true,
        elapsedLabel: '0:00',
        paused: false,
        collaborationEnabled: false,
      },
      // Keep SudokuGrid real (we assert on its input layer); everything in the
      // header/footer rail is unrelated to grid input and pulls in heavy deps.
      global: {
        plugins: [createPinia()],
        stubs: {
          SolverNumpad: true,
          PausedOverlay: true,
          PlayersPanel: true,
          ConnectionStatus: true,
          LiveSyncBadge: true,
          BackToPuzzleLink: true,
          SolverTimerPill: true,
        },
      },
    })
  }

  it('mounts an interactive grid (the input layer is present)', () => {
    expect(render().findComponent(InteractionLayer).exists()).toBe(true)
  })
})
