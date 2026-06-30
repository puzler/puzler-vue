import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GridLabelsLayer from './GridLabelsLayer.vue'
import { useGridStore } from '@/stores/grid'

let pinia: ReturnType<typeof createPinia>

describe('GridLabelsLayer', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const render = () => mount(GridLabelsLayer, { global: { plugins: [pinia] } })

  it('renders a label for every row and every column', () => {
    const grid = useGridStore()
    expect(render().findAll('text')).toHaveLength(grid.rows + grid.cols)
  })

  it('numbers rows and columns starting from 1', () => {
    const labels = render().findAll('text').map((t) => t.text())
    expect(labels).toContain('1')
    expect(labels).toContain('9')
  })
})
