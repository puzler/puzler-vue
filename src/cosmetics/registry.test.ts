import { describe, it, expect } from 'vitest'
import {
  registerCosmetic,
  getCosmetic,
  getAllCosmetics,
  type CosmeticDefinition,
} from './registry'

const makeCosmetic = (overrides: Partial<CosmeticDefinition> = {}): CosmeticDefinition => ({
  type: 'cell_color',
  displayName: 'Cell Color',
  icon: 'palette',
  renderComponent: null,
  defaultStyle: { color: '#ff0000', opacity: 1 },
  ...overrides,
})

describe('cosmetic registry', () => {
  it('registers and retrieves a cosmetic by type', () => {
    const def = makeCosmetic({ type: 'cell_color' })
    registerCosmetic(def)
    expect(getCosmetic('cell_color')).toBe(def)
  })

  it('returns undefined for an unregistered type', () => {
    // 'shape' is never registered in this test run
    expect(getCosmetic('shape')).toBeUndefined()
  })

  it('getAllCosmetics includes every registered cosmetic', () => {
    const def = makeCosmetic({ type: 'line' })
    registerCosmetic(def)
    expect(getAllCosmetics()).toContain(def)
  })

  it('overwriting a type replaces the previous registration', () => {
    const first = makeCosmetic({ type: 'text', displayName: 'First' })
    const second = makeCosmetic({ type: 'text', displayName: 'Second' })
    registerCosmetic(first)
    registerCosmetic(second)
    expect(getCosmetic('text')?.displayName).toBe('Second')
  })
})
