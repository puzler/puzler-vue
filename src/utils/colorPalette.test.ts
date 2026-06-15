import { describe, it, expect } from 'vitest'
import {
  ColorPalette,
  transparentFill,
  parseRgb,
  paletteDataFromRaw,
  MAX_PAGES,
} from './colorPalette'

describe('ColorPalette', () => {
  it('defaults to the ported palette (3 pages of 10, white at key 0)', () => {
    const p = new ColorPalette()
    expect(p.pages).toHaveLength(3)
    expect(p.pages[0]).toHaveLength(10)
    expect(p.colors['1']).toBe('rgb(180, 128, 241)')
    expect(p.colors['0']).toBe('rgb(255, 255, 255)')
  })

  it('round-trips through JSON', () => {
    const p = new ColorPalette()
    const restored = ColorPalette.fromString(p.toJson())
    expect(restored.toData()).toEqual(p.toData())
  })

  it('adds, duplicates, and deletes pages within bounds', () => {
    const p = new ColorPalette()
    p.newPage()
    expect(p.pages).toHaveLength(4)
    // fresh page keys are distinct from existing ones
    expect(new Set(p.pages.flat()).size).toBe(p.pages.flat().length)

    p.duplicatePage(0)
    expect(p.pages).toHaveLength(5)
    expect(p.pages.length).toBe(MAX_PAGES)
    // can't exceed the max
    expect(p.newPage()).toBeUndefined()
    expect(p.pages).toHaveLength(MAX_PAGES)

    const keys = p.pages[2]
    expect(p.deletePage(2)).toBe(true)
    expect(p.pages).toHaveLength(4)
    // deleted page's colors are gone
    keys.forEach((k) => expect(p.colors[k]).toBeUndefined())
  })

  it('refuses to delete the last remaining page', () => {
    const p = new ColorPalette({ colors: { '1': 'rgb(1,2,3)' }, pages: [['1']] })
    expect(p.deletePage(0)).toBe(false)
    expect(p.pages).toHaveLength(1)
  })

  it('swaps adjacent pages', () => {
    const p = new ColorPalette()
    const [a, b] = [p.pages[0], p.pages[1]]
    expect(p.movePageRight(0)).toBe(true)
    expect(p.pages[0]).toEqual(b)
    expect(p.pages[1]).toEqual(a)
    expect(p.movePageLeft(0)).toBe(false)
  })
})

describe('color conversion', () => {
  it('parses rgb and hex', () => {
    expect(parseRgb('rgb(180, 128, 241)')).toEqual({ red: 180, green: 128, blue: 241, opacity: 1 })
    expect(parseRgb('#ff8800')).toEqual({ red: 255, green: 136, blue: 0, opacity: 1 })
    expect(parseRgb('nonsense')).toBeNull()
    expect(parseRgb(undefined)).toBeNull()
  })

  it('renders white as no fill and colors as pastel rgba', () => {
    expect(transparentFill('rgb(255, 255, 255)')).toBeNull()
    expect(transparentFill(undefined)).toBeNull()
    const fill = transparentFill('rgb(180, 128, 241)')
    expect(fill).toMatch(/^rgba\(/)
  })
})

describe('paletteDataFromRaw', () => {
  it('rejects empty/malformed blobs and accepts valid ones', () => {
    expect(paletteDataFromRaw({})).toBeNull()
    expect(paletteDataFromRaw(null)).toBeNull()
    expect(paletteDataFromRaw({ colors: {}, pages: [] })).toBeNull()
    const data = { colors: { '1': 'rgb(1,2,3)' }, pages: [['1']] }
    expect(paletteDataFromRaw(data)).toEqual(data)
  })
})
