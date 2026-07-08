import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlayerSidePanel from './PlayerSidePanel.vue'
import BackToPuzzleLink from './BackToPuzzleLink.vue'
import LiveSyncBadge from './LiveSyncBadge.vue'

// The panel serves two hosts: the play page ('player') and the editor's solving
// mode ('editor'), which previews the play surface but has no live session. The
// editor variant must drop everything session-bound — back link, collaboration
// strip, reset, solution check — while keeping rules and settings.

describe('PlayerSidePanel variants', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function render(variant?: 'player' | 'editor') {
    return mount(PlayerSidePanel, {
      props: {
        title: 'Test puzzle',
        author: null,
        authorName: null,
        rules: 'Normal sudoku rules apply.',
        showTimer: false,
        elapsedLabel: '',
        paused: false,
        collaborationEnabled: false,
        ...(variant ? { variant } : {}),
      },
      // The collab strip and numpad pull in heavy store-backed deps unrelated
      // to what this suite pins down (which chrome each variant shows).
      global: {
        plugins: [createPinia()],
        stubs: {
          BackToPuzzleLink: true,
          LiveSyncBadge: true,
          PlayersPanel: true,
          ConnectionStatus: true,
          SolverNumpad: true,
          PlayerRulesPanel: true,
        },
      },
    })
  }

  function buttonLabels(wrapper: ReturnType<typeof render>): string[] {
    return wrapper.findAll('button').map((b) => b.attributes('aria-label') ?? '')
  }

  it('defaults to the player variant with the full session chrome', () => {
    const wrapper = render()
    expect(wrapper.findComponent(BackToPuzzleLink).exists()).toBe(true)
    expect(wrapper.findComponent(LiveSyncBadge).exists()).toBe(true)
    const labels = buttonLabels(wrapper)
    expect(labels).toContain('Show rules')
    expect(labels).toContain('Reset puzzle')
    expect(labels).toContain('Settings')
    expect(labels).toContain('Check solution')
  })

  it('editor variant hides the back link and collaboration strip', () => {
    const wrapper = render('editor')
    expect(wrapper.findComponent(BackToPuzzleLink).exists()).toBe(false)
    expect(wrapper.findComponent(LiveSyncBadge).exists()).toBe(false)
  })

  it('editor variant keeps rules + settings but drops reset + check', () => {
    const labels = buttonLabels(render('editor'))
    expect(labels).toContain('Show rules')
    expect(labels).toContain('Settings')
    expect(labels).not.toContain('Reset puzzle')
    expect(labels).not.toContain('Check solution')
  })

  it('editor variant emits show-rules and settings from its buttons', async () => {
    const wrapper = render('editor')
    await wrapper.find('button[aria-label="Show rules"]').trigger('click')
    await wrapper.find('button[aria-label="Settings"]').trigger('click')
    expect(wrapper.emitted('show-rules')).toHaveLength(1)
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })
})
