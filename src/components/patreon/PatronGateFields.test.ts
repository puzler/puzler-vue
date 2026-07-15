import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PatronGateFields from './PatronGateFields.vue'
import { useAuthStore } from '@/stores/auth'
import { PatronGateModeEnum } from '@/graphql/generated/types'
import { defaultPatronGateForm, type PatronGateForm } from '@/constants/patreon'

function campaignWith(tiers: Array<{ id: string; title: string; amountCents: number; published?: boolean; discarded?: boolean }>) {
  return {
    capabilities: { memberships: true, creator: true },
    campaign: {
      id: 'c1',
      title: 'Camp',
      url: null,
      currency: 'USD',
      status: 'ACTIVE',
      teasersEnabled: true,
      campaignSyncedAt: null,
      tiers: tiers.map((t) => ({ patreonId: t.id, published: true, discarded: false, ...t })),
    },
    memberships: [],
  }
}

describe('PatronGateFields', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function render(form: Partial<PatronGateForm> = {}, tiers = [
    { id: 't1', title: 'Bronze', amountCents: 300 },
    { id: 't2', title: 'Gold', amountCents: 1000 },
  ]) {
    const auth = useAuthStore()
    auth.user = { id: '1', oauthConnections: [{ provider: 'patreon', createdAt: 'now' }], patreon: campaignWith(tiers) } as never
    // Real v-model semantics: later interactions see earlier updates. The
    // holder + optional chaining skips the immediate-watcher emit that fires
    // mid-mount (before the wrapper exists).
    const holder: { wrapper?: ReturnType<typeof mount> } = {}
    holder.wrapper = mount(PatronGateFields, {
      props: {
        modelValue: { ...defaultPatronGateForm(), ...form },
        'onUpdate:modelValue': (value: PatronGateForm) => void holder.wrapper?.setProps({ modelValue: value }),
      },
    })
    return holder.wrapper
  }

  it('defaults to minimum tier with the campaign tiers listed by price', () => {
    const wrapper = render()
    const options = wrapper.find('select').findAll('option').map((o) => o.text())
    expect(options[0]).toContain('Any paying patron')
    expect(options[1]).toContain('Bronze')
    expect(options[1]).toContain('$3')
  })

  it('lets creators multi-select tiers in tier_list mode', async () => {
    const wrapper = render({ mode: PatronGateModeEnum.TierList })
    const checkboxes = wrapper.findAll('fieldset input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)

    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    const emitted = wrapper.emitted('update:modelValue')
    expect((emitted?.at(-1)?.[0] as PatronGateForm).tierIds).toEqual([ 't1', 't2' ])
  })

  it('converts the pledge amount to cents', async () => {
    const wrapper = render({ mode: PatronGateModeEnum.MinAmount })
    await wrapper.find('input[type="number"]').setValue('4.50')
    const emitted = wrapper.emitted('update:modelValue')
    expect((emitted?.at(-1)?.[0] as PatronGateForm).minAmountCents).toBe(450)
  })

  it('forces amount mode and disables tier modes when no tiers are published', () => {
    const wrapper = render({}, [])
    const emitted = wrapper.emitted('update:modelValue')
    expect((emitted?.at(-1)?.[0] as PatronGateForm).mode).toBe(PatronGateModeEnum.MinAmount)
    expect(wrapper.text()).toContain('no published tiers')
    const disabled = wrapper.findAll('input[type="radio"][disabled]')
    expect(disabled).toHaveLength(2)
  })

  it('emits the back-catalog lock toggle', async () => {
    const wrapper = render()
    const checkbox = wrapper.findAll('input[type="checkbox"]').at(-1)!
    await checkbox.setValue(true)
    const emitted = wrapper.emitted('update:modelValue')
    expect((emitted?.at(-1)?.[0] as PatronGateForm).patronsSinceRelease).toBe(true)
  })

  it('round-trips the scheduled release through the datetime input', async () => {
    const wrapper = render()
    await wrapper.find('input[type="datetime-local"]').setValue('2026-08-01T09:00')
    const emitted = wrapper.emitted('update:modelValue')
    const value = (emitted?.at(-1)?.[0] as PatronGateForm).releasedAt
    expect(value).toBe(new Date('2026-08-01T09:00').toISOString())
  })
})
