import { describe, it, expect } from 'vitest'
import {
  CollectionAccentColorEnum,
  CollectionBgTreatmentEnum,
  CollectionTitleFontEnum,
} from '@/graphql/generated/types'
import {
  ACCENT_OPTIONS, BG_OPTIONS, FONT_OPTIONS, collectionThemeClasses,
} from './collectionTheme'

describe('collectionThemeClasses', () => {
  it('maps defaults (and missing values) to no classes', () => {
    expect(collectionThemeClasses({
      accentColor: CollectionAccentColorEnum.Default,
      bgTreatment: CollectionBgTreatmentEnum.Default,
      titleFont: CollectionTitleFontEnum.Default,
    })).toEqual([])
    expect(collectionThemeClasses({})).toEqual([])
    expect(collectionThemeClasses({ accentColor: null, bgTreatment: null, titleFont: null })).toEqual([])
  })

  it('maps every non-default enum value to a distinct class', () => {
    const nonDefaultAccents = Object.values(CollectionAccentColorEnum).filter((v) => v !== CollectionAccentColorEnum.Default)
    const accentClasses = nonDefaultAccents.map((accentColor) => collectionThemeClasses({ accentColor })[0])
    expect(accentClasses.every((c) => c?.startsWith('collection-accent-'))).toBe(true)
    expect(new Set(accentClasses).size).toBe(nonDefaultAccents.length)

    const nonDefaultBgs = Object.values(CollectionBgTreatmentEnum).filter((v) => v !== CollectionBgTreatmentEnum.Default)
    const bgClasses = nonDefaultBgs.map((bgTreatment) => collectionThemeClasses({ bgTreatment })[0])
    expect(bgClasses.every((c) => c?.startsWith('collection-bg-'))).toBe(true)
    expect(new Set(bgClasses).size).toBe(nonDefaultBgs.length)

    const nonDefaultFonts = Object.values(CollectionTitleFontEnum).filter((v) => v !== CollectionTitleFontEnum.Default)
    const fontClasses = nonDefaultFonts.map((titleFont) => collectionThemeClasses({ titleFont })[0])
    expect(fontClasses.every((c) => c?.startsWith('collection-font-'))).toBe(true)
    expect(new Set(fontClasses).size).toBe(nonDefaultFonts.length)
  })

  it('combines all three axes in one class list', () => {
    expect(collectionThemeClasses({
      accentColor: CollectionAccentColorEnum.Forest,
      bgTreatment: CollectionBgTreatmentEnum.Dusk,
      titleFont: CollectionTitleFontEnum.Serif,
    })).toEqual([ 'collection-accent-forest', 'collection-bg-dusk', 'collection-font-serif' ])
  })

  it('offers a picker option for every enum value', () => {
    expect(ACCENT_OPTIONS.map((o) => o.value).sort()).toEqual(Object.values(CollectionAccentColorEnum).sort())
    expect(BG_OPTIONS.map((o) => o.value).sort()).toEqual(Object.values(CollectionBgTreatmentEnum).sort())
    expect(FONT_OPTIONS.map((o) => o.value).sort()).toEqual(Object.values(CollectionTitleFontEnum).sort())
  })
})
