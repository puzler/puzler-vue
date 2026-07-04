import { describe, it, expect } from 'vitest'
import { usePresetCollection, styledPatch } from './usePresetCollection'

interface TestPreset {
  id: string
  label: string
  style: { color: string }
}

function makeCollection() {
  return usePresetCollection<TestPreset, Partial<TestPreset['style']>>(
    'Test',
    () => ({ style: { color: '#111111' } }),
    styledPatch,
  )
}

describe('usePresetCollection', () => {
  it('duplicate inserts a copy after the original and activates it', () => {
    const c = makeCollection()
    const first = c.presets.value[0]
    c.add()
    const copy = c.duplicate(first.id)!

    expect(c.presets.value.map((p) => p.id)).toEqual([first.id, copy.id, c.presets.value[2].id])
    expect(copy.label).toBe('Test 1 copy')
    expect(copy.style).toEqual(first.style)
    expect(copy.style).not.toBe(first.style) // deep-cloned, not shared
    expect(c.activeId.value).toBe(copy.id)
  })

  it('duplicate returns null for an unknown id', () => {
    const c = makeCollection()
    expect(c.duplicate('nope')).toBeNull()
    expect(c.presets.value).toHaveLength(1)
  })

  it('remove refuses to drop the last preset', () => {
    const c = makeCollection()
    expect(c.remove(c.presets.value[0].id)).toBeNull()
    expect(c.presets.value).toHaveLength(1)
  })

  it('remove activates the previous preset when the active one goes', () => {
    const c = makeCollection()
    const first = c.presets.value[0]
    const second = c.add()
    const removed = c.remove(second.id)!

    expect(removed.preset.id).toBe(second.id)
    expect(removed.index).toBe(1)
    expect(c.presets.value.map((p) => p.id)).toEqual([first.id])
    expect(c.activeId.value).toBe(first.id)
  })

  it('remove keeps the active preset when a different one goes', () => {
    const c = makeCollection()
    const first = c.presets.value[0]
    const second = c.add()
    c.remove(first.id)
    expect(c.activeId.value).toBe(second.id)
  })

  it('restore reinserts a removed preset at its index and activates it', () => {
    const c = makeCollection()
    const first = c.presets.value[0]
    c.add()
    const removed = c.remove(first.id)!
    c.restore(removed.preset, removed.index)

    expect(c.presets.value[0].id).toBe(first.id)
    expect(c.activeId.value).toBe(first.id)
  })

  it('rename trims the label and ignores empty input', () => {
    const c = makeCollection()
    const id = c.presets.value[0].id
    c.rename(id, '  My Style  ')
    expect(c.presets.value[0].label).toBe('My Style')
    c.rename(id, '   ')
    expect(c.presets.value[0].label).toBe('My Style')
  })
})
