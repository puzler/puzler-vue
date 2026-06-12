import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import AppFooter from './AppFooter.vue'

describe('AppFooter', () => {
  function render() {
    return mount(AppFooter, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
  }

  it('links to the legal pages', () => {
    const links = render().findAllComponents(RouterLinkStub)
    const targets = links.map((l) => l.props('to'))
    expect(targets).toContain('/legal/tos')
    expect(targets).toContain('/legal/privacy')
  })

  it('links to the API explorer', () => {
    const explorer = render()
      .findAll('a')
      .find((a) => a.text() === 'API Explorer')
    expect(explorer?.attributes('href')).toContain('/explorer')
  })

  it('shows a copyright line', () => {
    expect(render().text()).toContain('Puzler')
    expect(render().text()).toContain('©')
  })
})
