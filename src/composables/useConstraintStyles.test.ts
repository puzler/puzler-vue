import { describe, it, expect } from 'vitest'
import {
  resolveLineStyle, resolveShapeStyle, resolveTextStyle,
  resolveCellBgColor, resolveCageStyle, resolveBetweenLineStyle, resolveMinMaxStyle,
} from './useConstraintStyles'
import { CONSTRAINT_LINE_STYLES, BETWEEN_LINE_STYLE } from '@/types/constraints'
import {
  SHAPE_STYLES, TEXT_STYLES, CELL_BACKGROUND_COLORS, CAGE_STYLE, colorToCss,
} from '@/types/constraintStyles'

// The core Phase-0 guarantee: with no theme override, every resolver returns BYTE-IDENTICAL
// values to what the components render today (the existing constants). This is what lets the
// Classic theme reproduce the current look pixel-for-pixel.
describe('useConstraintStyles — defaults match legacy constants', () => {
  it('lines match CONSTRAINT_LINE_STYLES', () => {
    for (const key of ['renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum'] as const) {
      expect(resolveLineStyle(key)).toEqual(CONSTRAINT_LINE_STYLES[key])
    }
  })

  it('diagonals match the inline ConstraintLayer colors', () => {
    expect(resolveLineStyle('positive_diagonal')).toEqual({ color: '#93c5fd', strokeWidth: 2, opacity: 0.85 })
    expect(resolveLineStyle('anti_negative_diagonal')).toEqual({ color: '#f87171', strokeWidth: 2, opacity: 0.85 })
  })

  it('shapes match rendered SHAPE_STYLES', () => {
    for (const key of ['odd_cells', 'even_cells', 'difference_dots', 'ratio_dots', 'quadruples'] as const) {
      const s = SHAPE_STYLES[key]
      expect(resolveShapeStyle(key)).toEqual({
        fillColor: colorToCss(s.fillColor),
        outlineColor: colorToCss(s.outlineColor),
        textColor: colorToCss(s.textColor),
        width: s.width,
        height: s.height,
      })
    }
  })

  it('text clues match rendered TEXT_STYLES', () => {
    for (const key of ['xv', 'x_sums', 'sandwich_sums', 'skyscrapers', 'little_killers'] as const) {
      const t = TEXT_STYLES[key]
      expect(resolveTextStyle(key)).toEqual({ fontColor: colorToCss(t.fontColor), size: t.size })
    }
  })

  it('cell backgrounds match rendered CELL_BACKGROUND_COLORS', () => {
    expect(resolveCellBgColor('extra_regions')).toBe(colorToCss(CELL_BACKGROUND_COLORS.extra_regions))
    expect(resolveCellBgColor('clone')).toBe(colorToCss(CELL_BACKGROUND_COLORS.clone))
    expect(resolveCellBgColor('row_index_cells')).toBe(colorToCss(CELL_BACKGROUND_COLORS.row_index_cells))
  })

  it('cage matches CAGE_STYLE', () => {
    expect(resolveCageStyle()).toEqual({
      color: colorToCss(CAGE_STYLE.cageColor),
      textColor: colorToCss(CAGE_STYLE.textColor),
    })
  })

  it('between line matches BETWEEN_LINE_STYLE', () => {
    expect(resolveBetweenLineStyle()).toEqual(BETWEEN_LINE_STYLE)
  })

  it('min/max match the inline chevron + halo and background fill', () => {
    expect(resolveMinMaxStyle('minimums')).toEqual({
      backgroundColor: colorToCss(CELL_BACKGROUND_COLORS.minimums),
      chevronColor: '#333333',
      halo: '#ffffff',
    })
  })
})

describe('useConstraintStyles — gate (enableCustomStyles)', () => {
  it('ignores the override entirely when disabled', () => {
    const wild = { color: '#ff0000', strokeWidth: 999, opacity: 5 }
    expect(resolveLineStyle('german_whispers', wild, false)).toEqual(CONSTRAINT_LINE_STYLES.german_whispers)
    expect(resolveShapeStyle('odd_cells', { fillColor: '#000', size: 2 }, false))
      .toEqual(resolveShapeStyle('odd_cells'))
    expect(resolveCellBgColor('clone', { backgroundColor: '#000' }, false))
      .toBe(colorToCss(CELL_BACKGROUND_COLORS.clone))
  })
})

describe('useConstraintStyles — override merge + clamp', () => {
  it('applies overrides and clamps wonky numbers when enabled', () => {
    expect(resolveLineStyle('german_whispers', { color: '#ff0000', strokeWidth: 999, opacity: 5 }, true))
      .toEqual({ color: '#ff0000', strokeWidth: 24, opacity: 1 })
  })

  it('a single size override drives both shape dimensions, clamped', () => {
    const r = resolveShapeStyle('odd_cells', { size: 2 }, true)
    expect(r.width).toBe(0.95)
    expect(r.height).toBe(0.95)
  })

  it('only overrides the fields present, leaving the rest at default', () => {
    const base = resolveShapeStyle('ratio_dots')
    const r = resolveShapeStyle('ratio_dots', { fillColor: '#123456' }, true)
    expect(r.fillColor).toBe('#123456')
    expect(r.outlineColor).toBe(base.outlineColor)
    expect(r.width).toBe(base.width)
  })

  it('themed min/max fill derives a contrasting halo', () => {
    const dark = resolveMinMaxStyle('minimums', { backgroundColor: '#101010' }, true)
    expect(dark.backgroundColor).toBe('#101010')
    expect(dark.halo).toBe('#ffffff') // light halo over a dark fill
    const light = resolveMinMaxStyle('maximums', { backgroundColor: '#f5f5f5' }, true)
    expect(light.halo).toBe('#1a1a1a') // dark halo over a light fill
  })
})
