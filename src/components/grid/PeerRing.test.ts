import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PeerRing from './PeerRing.vue'

let pinia: ReturnType<typeof createPinia>

describe('PeerRing', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it("draws a collaborator's selection ring in their assigned color", () => {
    const w = mount(PeerRing, {
      props: { cells: new Set(['r0c0']), color: '#ff8800' },
      global: { plugins: [pinia] },
    })
    const paths = w.findAll('path')
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0].attributes('stroke')).toBe('#ff8800')
  })
})
