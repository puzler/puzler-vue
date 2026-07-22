import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HelperDrawer from './HelperDrawer.vue'
import ComboList from './ComboList.vue'
import SelectionCalculator from './SelectionCalculator.vue'
import KillerCageHelper from './KillerCageHelper.vue'
import SumCombinationHelper from './SumCombinationHelper.vue'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { enumerateCombos } from '@/utils/sumCombinations'

// The drawer's gating IS the competition kill switch: it reads effective
// settings, so enforced overrides beat player prefs with no extra wiring.

describe('HelperDrawer', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function render() {
    return mount(HelperDrawer)
  }

  it('renders nothing while every helper is disabled', () => {
    expect(render().find('aside').exists()).toBe(false)
  })

  it('shows only the enabled sections', async () => {
    const player = usePlayerSettingsStore()
    player.settings.enableSelectionCalculator = true
    const wrapper = render()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('aside').exists()).toBe(true)
    expect(wrapper.findComponent(SelectionCalculator).exists()).toBe(true)
    expect(wrapper.findComponent(KillerCageHelper).exists()).toBe(false)
    expect(wrapper.findComponent(SumCombinationHelper).exists()).toBe(false)
  })

  it('vanishes when a competition enforces the helpers off', async () => {
    const player = usePlayerSettingsStore()
    player.settings.enableSumHelper = true
    player.settings.enableKillerHelper = true
    player.setOverrides({ enableSumHelper: false, enableKillerHelper: false })
    const wrapper = render()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('hides beyond the enumeration-safe digit range', async () => {
    usePlayerSettingsStore().settings.enableSumHelper = true
    useGridStore().digits = 17
    const wrapper = render()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('collapses to a slim rail and back', async () => {
    usePlayerSettingsStore().settings.enableSumHelper = true
    const wrapper = render()
    await wrapper.get('[aria-label="Collapse helpers"]').trigger('click')
    expect(wrapper.findComponent(SumCombinationHelper).exists()).toBe(false)
    await wrapper.get('[aria-label="Expand helpers"]').trigger('click')
    expect(wrapper.findComponent(SumCombinationHelper).exists()).toBe(true)
  })
})

describe('SelectionCalculator states', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the range, then the hint when the selection shrinks', async () => {
    const editor = useEditorStore()
    const wrapper = mount(SelectionCalculator)
    expect(wrapper.text()).toContain('Select two or more cells')

    editor.selection = new Set(['r0c0', 'r0c1'])
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('3-17')
    expect(wrapper.text()).toContain('2 cells')
  })

  it('renders No valid sum on contradiction', async () => {
    const editor = useEditorStore()
    editor.solverCellStates = {
      r0c0: { value: 'A', cornerMarks: [], centerMarks: [], color: null, colors: [] },
    }
    const wrapper = mount(SelectionCalculator)
    editor.selection = new Set(['r0c0', 'r0c1'])
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('No valid sum')
  })
})

describe('ComboList strikes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('emits toggle with the combo key and strikes rows visually', async () => {
    const { combos } = enumerateCombos(9, { size: 2, total: 5 })
    const wrapper = mount(ComboList, {
      props: { combos, struck: new Set(['2,3']), showTotals: false },
    })
    const rows = wrapper.findAll('li button')
    expect(rows).toHaveLength(2)
    expect(rows[1].find('.line-through').exists()).toBe(true)
    expect(rows[0].find('.line-through').exists()).toBe(false)
    await rows[0].trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['1,4']])
  })
})
