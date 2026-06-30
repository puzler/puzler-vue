import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SelectionLayer from './SelectionLayer.vue'

let pinia: ReturnType<typeof createPinia>

describe('SelectionLayer', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const render = (selection: Set<string>) =>
    mount(SelectionLayer, { props: { selection }, global: { plugins: [pinia] } })

  it('renders nothing when the selection is empty', () => {
    const w = render(new Set())
    expect(w.find('g').exists()).toBe(false)
    expect(w.findAll('path')).toHaveLength(0)
  })

  it('renders a selection ring path when cells are selected', () => {
    const w = render(new Set(['r0c0', 'r0c1']))
    const paths = w.findAll('path')
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0].attributes('d')).toBeTruthy()
  })
})
