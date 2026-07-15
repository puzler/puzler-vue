import { describe, it, expect } from 'vitest'
import { formatCents } from './currency'

describe('formatCents', () => {
  it('formats whole-unit prices without decimals', () => {
    expect(formatCents(300, 'USD')).toBe('$3')
  })

  it('keeps decimals for fractional amounts', () => {
    expect(formatCents(350, 'USD')).toBe('$3.50')
  })

  it('respects the campaign currency', () => {
    expect(formatCents(500, 'EUR')).toContain('5')
    expect(formatCents(500, 'EUR')).not.toContain('$5')
  })

  it('defaults to USD when the currency is missing', () => {
    expect(formatCents(100, null)).toBe('$1')
    expect(formatCents(100)).toBe('$1')
  })

  it('falls back to a bare decimal for unknown currency codes', () => {
    expect(formatCents(1234, 'NOPE')).toBe('12.34')
  })
})
