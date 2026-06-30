import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import EditorMobileLayout from './EditorMobileLayout.vue'
import InteractionLayer from '@/components/grid/InteractionLayer.vue'

// Editor page regression guard. Like the player, the editor renders <SudokuGrid>
// without an `interactive` prop, so prove the composition mounts a real,
// interactive grid. (The desktop editor in EditorView uses the identical
// `<SudokuGrid mode="edit">` pattern; the shared contract is pinned by
// SudokuGrid.test.ts.)

describe('EditorMobileLayout grid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function render() {
    return mount(EditorMobileLayout, {
      // Keep SudokuGrid real; stub the bottom control surface, which is
      // unrelated to grid input and brings in many sibling panels.
      global: {
        plugins: [createPinia()],
        stubs: {
          EditorMobileIconBar: true,
          ToolSelector: true,
          ToolControlBox: true,
          SolverNumpad: true,
          SolverControls: true,
          PuzzleControls: true,
        },
      },
    })
  }

  it('mounts an interactive grid (the input layer is present)', () => {
    expect(render().findComponent(InteractionLayer).exists()).toBe(true)
  })
})
