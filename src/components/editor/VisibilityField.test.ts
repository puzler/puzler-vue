import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VisibilityField from './VisibilityField.vue'
import { PuzzleVisibilityEnum } from '@/graphql/generated/types'

describe('VisibilityField', () => {
  function render(props: { modelValue: PuzzleVisibilityEnum; allowPatrons?: boolean }) {
    return mount(VisibilityField, { props })
  }

  it('offers the four base modes by default', () => {
    const labels = render({ modelValue: PuzzleVisibilityEnum.Private })
      .findAll('label')
      .map((l) => l.text())
    expect(labels).toHaveLength(4)
    expect(labels.join(' ')).not.toContain('Patrons')
  })

  it('appends the Patrons mode for creators', () => {
    const labels = render({ modelValue: PuzzleVisibilityEnum.Private, allowPatrons: true }).findAll('label')
    expect(labels).toHaveLength(5)
    expect(labels.at(-1)?.text()).toContain('Patrons')
  })

  it('keeps showing Patrons when it is the current value, even for non-creators', () => {
    // A puzzle already gated stays representable if creator status lapses.
    const labels = render({ modelValue: PuzzleVisibilityEnum.PatronsOnly }).findAll('label')
    expect(labels).toHaveLength(5)
  })

  it('emits the selected mode', async () => {
    const wrapper = render({ modelValue: PuzzleVisibilityEnum.Private, allowPatrons: true })
    await wrapper.findAll('input[type="radio"]').at(-1)!.setValue()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([ PuzzleVisibilityEnum.PatronsOnly ])
  })
})
