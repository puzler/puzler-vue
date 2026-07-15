import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/puzzles/1' }),
  RouterLink: { template: '<a><slot /></a>' },
}))

import PatronLockPanel from './PatronLockPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { PatronLockReasonEnum } from '@/graphql/generated/types'

describe('PatronLockPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function render(reason: PatronLockReasonEnum, { loggedIn = true } = {}) {
    const auth = useAuthStore()
    if (loggedIn) {
      auth.setToken('tok')
      auth.user = { id: '1', oauthConnections: [] } as never
    }
    return mount(PatronLockPanel, {
      props: {
        access: {
          lockedReason: reason,
          requiredTierTitle: 'Gold',
          campaignTitle: 'Puzzles Weekly',
          campaignUrl: 'https://www.patreon.com/pw',
        },
        kind: 'puzzle',
        authorName: 'Ann',
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
  }

  it('offers login to guests', () => {
    const wrapper = render(PatronLockReasonEnum.NotLinked, { loggedIn: false })
    expect(wrapper.text()).toContain('Log in to check your access')
    expect(wrapper.text()).not.toContain('Re-check access')
  })

  it('offers Connect Patreon to logged-in unlinked viewers', () => {
    const wrapper = render(PatronLockReasonEnum.NotLinked)
    expect(wrapper.text()).toContain('Connect Patreon')
    expect(wrapper.text()).toContain("This puzzle is for Ann's patrons")
  })

  it('offers become-a-patron plus re-check for non-patrons', () => {
    const wrapper = render(PatronLockReasonEnum.NotPatron)
    const external = wrapper.find('a[href="https://www.patreon.com/pw"]')
    expect(external.exists()).toBe(true)
    expect(wrapper.text()).toContain('Re-check access')
    expect(wrapper.text()).toContain('Requires the Gold tier')
  })

  it('drops the become-a-patron CTA for back-catalog locks (joining cannot unlock it)', () => {
    const wrapper = render(PatronLockReasonEnum.JoinedAfterRelease)
    expect(wrapper.find('a[href="https://www.patreon.com/pw"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('patrons at the time it came out')
  })

  it('explains declined payments', () => {
    const wrapper = render(PatronLockReasonEnum.Declined)
    expect(wrapper.text()).toContain('declined')
  })
})
