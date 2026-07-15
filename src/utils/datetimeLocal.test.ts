import { describe, it, expect } from 'vitest'
import { toLocalInput, fromLocalInput } from './datetimeLocal'

describe('datetimeLocal', () => {
  it('round-trips an ISO timestamp through the input format', () => {
    const iso = new Date('2026-07-14T18:30:00').toISOString()
    const input = toLocalInput(iso)
    expect(input).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(fromLocalInput(input)).toBe(iso)
  })

  it('renders in the viewer local timezone', () => {
    const input = toLocalInput('2026-07-14T18:30:00')
    expect(input).toBe('2026-07-14T18:30')
  })

  it('returns empty string for null/undefined/invalid ISO input', () => {
    expect(toLocalInput(null)).toBe('')
    expect(toLocalInput(undefined)).toBe('')
    expect(toLocalInput('not a date')).toBe('')
  })

  it('returns null for empty or invalid local input', () => {
    expect(fromLocalInput('')).toBeNull()
    expect(fromLocalInput('nope')).toBeNull()
  })
})
