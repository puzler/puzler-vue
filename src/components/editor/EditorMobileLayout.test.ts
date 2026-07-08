import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import EditorMobileLayout from './EditorMobileLayout.vue'
import EditorMobileIconBar from './EditorMobileIconBar.vue'
import InteractionLayer from '@/components/grid/InteractionLayer.vue'
import { useEditorStore } from '@/stores/editor'

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

// The mobile editor has no side panel, so in solving mode the icon rail hosts
// the play-surface Rules and Settings entry points; the layout must relay them
// up to EditorView, which owns the modals.
describe('EditorMobileLayout solving-mode play controls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function render() {
    return mount(EditorMobileLayout, {
      global: {
        stubs: {
          SudokuGrid: true,
          ToolSelector: true,
          ToolControlBox: true,
          SolverNumpad: true,
          SolverControls: true,
          PuzzleControls: true,
        },
      },
    })
  }

  it('re-emits show-rules and settings from the icon bar', async () => {
    const wrapper = render()
    useEditorStore().setMode('solving')
    await wrapper.vm.$nextTick()
    const bar = wrapper.findComponent(EditorMobileIconBar)
    await bar.find('button[aria-label="Show rules"]').trigger('click')
    await bar.find('button[aria-label="Settings"]').trigger('click')
    expect(wrapper.emitted('show-rules')).toHaveLength(1)
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })

  it('hides the rules/settings buttons while setting', () => {
    const bar = render().findComponent(EditorMobileIconBar)
    expect(bar.find('button[aria-label="Show rules"]').exists()).toBe(false)
    expect(bar.find('button[aria-label="Settings"]').exists()).toBe(false)
  })
})
