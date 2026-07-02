import { describe, it, expect } from 'vitest'
import {
  CONSTRAINT_LINE_TYPES, THERMO_TYPES, CONNECTOR_DOT_TYPES, BORDER_CONNECTOR_TYPES,
  OUTER_CLUE_TYPES, SINGLE_CELL_TYPES, LOCAL_TOOL_TYPES,
  SINGLE_CELL_EXCLUSIONS, GLOBAL_VARIANT_EXCLUSIONS, GLOBAL_VARIANTS,
  CONSTRAINT_ICONS, CONSTRAINT_STYLE_REGISTRY, CONSTRAINT_FILTER_GROUPS,
  LOCAL_PICKER_GROUPS, pickerOptionsFor, panelForTool, toolboxCategory,
  layerIdsForSlot, constraintDef,
} from './registry'

// The registry replaced hand-maintained literals spread across ~10 files. These tests
// pin the derived structures to the exact values those literals had, so a def edit
// that would silently change membership, grouping or dispatch fails loudly here.

describe('constraint registry derivations', () => {
  it('derives the draw-tool membership sets', () => {
    expect(CONSTRAINT_LINE_TYPES).toEqual(new Set(['renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum', 'entropic_lines', 'modular_lines', 'nabner_lines', 'zipper_lines', 'between_lines']))
    expect(THERMO_TYPES).toEqual(new Set(['thermometer', 'slow_thermometer']))
    expect(CONNECTOR_DOT_TYPES).toEqual(new Set(['difference_dots', 'ratio_dots']))
    expect(BORDER_CONNECTOR_TYPES).toEqual(new Set(['difference_dots', 'ratio_dots', 'xv', 'quadruples']))
    expect(OUTER_CLUE_TYPES).toEqual(new Set(['x_sums', 'sandwich_sums', 'skyscrapers', 'little_killers']))
    expect(SINGLE_CELL_TYPES).toEqual(new Set(['odd_cells', 'even_cells', 'minimums', 'maximums', 'row_index_cells', 'col_index_cells']))
    expect(LOCAL_TOOL_TYPES.size).toBe(30)
    expect(LOCAL_TOOL_TYPES.has('killer_cage')).toBe(true)
    expect(LOCAL_TOOL_TYPES.has('diagonals')).toBe(false)
    expect(LOCAL_TOOL_TYPES.has('cosmetic_line')).toBe(false)
  })

  it('derives the exclusion pairs', () => {
    expect(SINGLE_CELL_EXCLUSIONS).toEqual({
      odd_cells: 'even_cells',
      even_cells: 'odd_cells',
      minimums: 'maximums',
      maximums: 'minimums',
    })
    expect(GLOBAL_VARIANT_EXCLUSIONS).toEqual({
      positive_diagonal: 'anti_positive_diagonal',
      anti_positive_diagonal: 'positive_diagonal',
      negative_diagonal: 'anti_negative_diagonal',
      anti_negative_diagonal: 'negative_diagonal',
    })
  })

  it('derives global variants per category, in def order', () => {
    expect(Object.keys(GLOBAL_VARIANTS)).toEqual(['diagonals', 'chess', 'anti_kropki', 'anti_xv', 'disjoint_sets'])
    expect(GLOBAL_VARIANTS.diagonals.map(v => v.type)).toEqual([
      'positive_diagonal', 'negative_diagonal', 'anti_positive_diagonal', 'anti_negative_diagonal',
    ])
    expect(GLOBAL_VARIANTS.chess).toEqual([
      { type: 'kings_move', label: "King's move" },
      { type: 'knights_move', label: "Knight's move" },
    ])
    expect(GLOBAL_VARIANTS.disjoint_sets).toEqual([])
  })

  it('derives an icon for every pickable type and the global-variant filters', () => {
    for (const type of LOCAL_TOOL_TYPES) expect(CONSTRAINT_ICONS[type], type).toBeDefined()
    for (const type of ['diagonals', 'chess', 'kings_move', 'knights_move', 'anti_kropki', 'anti_xv', 'disjoint_sets',
      'cosmetic_line', 'cell_color', 'shape', 'text', 'cosmetic_cage']) {
      expect(CONSTRAINT_ICONS[type], type).toBeDefined()
    }
    // Line icons take their color from the def's line style (one source of truth).
    expect(CONSTRAINT_ICONS.renban.color).toBe('rgba(240, 103, 240, 1)')
    expect(CONSTRAINT_ICONS.between_lines.color).toBeUndefined()
    expect(CONSTRAINT_ICONS.quadruples.rotate).toBe(45)
  })

  it('derives the theme style registry with all 34 themeable keys', () => {
    const keys = Object.keys(CONSTRAINT_STYLE_REGISTRY)
    expect(keys).toHaveLength(34)
    expect(CONSTRAINT_STYLE_REGISTRY.german_whispers).toEqual({ family: 'line', category: 'lines', label: 'German whispers' })
    expect(CONSTRAINT_STYLE_REGISTRY.renban.label).toBe('Renban')
    expect(CONSTRAINT_STYLE_REGISTRY.positive_diagonal.family).toBe('diagonal')
    expect(CONSTRAINT_STYLE_REGISTRY.minimums.family).toBe('minmax')
    // Theme-editor order within the lines category is preserved.
    expect(keys.filter(k => CONSTRAINT_STYLE_REGISTRY[k as keyof typeof CONSTRAINT_STYLE_REGISTRY].category === 'lines')).toEqual([
      'renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum',
      'entropic_lines', 'modular_lines', 'nabner_lines', 'zipper_lines', 'between_lines',
      'thermometer', 'slow_thermometer', 'arrow',
    ])
  })

  it('derives the archive filter groups with their historical option order', () => {
    expect(CONSTRAINT_FILTER_GROUPS.map(g => g.label)).toEqual([
      'Lines', 'Cells', 'Connectors', 'Cages & Regions', 'Outer Clues', 'Global',
    ])
    const lines = CONSTRAINT_FILTER_GROUPS[0].options.map(o => o.value)
    expect(lines).toEqual([
      'thermometer', 'slow_thermometer', 'arrow', 'renban', 'german_whispers',
      'dutch_whispers', 'palindrome', 'region_sum', 'entropic_lines', 'modular_lines',
      'nabner_lines', 'zipper_lines', 'between_lines',
    ])
    const global = CONSTRAINT_FILTER_GROUPS[5].options
    expect(global.map(o => o.value)).toEqual([
      'diagonals', 'kings_move', 'knights_move', 'anti_kropki', 'anti_xv', 'disjoint_sets',
    ])
    expect(global[1].label).toBe("King's Move")
  })

  it('derives the local picker groups with plural picker labels', () => {
    expect(LOCAL_PICKER_GROUPS.map(g => g.key)).toEqual([
      'lines', 'single_cell', 'cell_connectors', 'multi_cell', 'outer_clues',
    ])
    const multiCell = LOCAL_PICKER_GROUPS.find(g => g.key === 'multi_cell')!
    expect(multiCell.options.map(o => o.type).sort()).toEqual(
      ['arrow', 'clone', 'extra_regions', 'killer_cage', 'slow_thermometer', 'thermometer'],
    )
    expect(multiCell.options.find(o => o.type === 'thermometer')!.label).toBe('Thermometers')
  })

  it('derives sidebar picker options for global and cosmetic categories', () => {
    expect(pickerOptionsFor('global').map(o => o.label)).toEqual([
      'Diagonals', 'Chess', 'Anti-Kropki', 'Anti-XV', 'Disjoint Sets',
    ])
    expect(pickerOptionsFor('cosmetic').map(o => o.label)).toEqual([
      'Line', 'Cell color', 'Shape', 'Text', 'Cage',
    ])
  })

  it('routes toolbox categories and panels', () => {
    expect(toolboxCategory('renban')).toBe('line')
    expect(toolboxCategory('killer_cage')).toBe('region')
    expect(toolboxCategory('kings_move')).toBeUndefined()
    expect(panelForTool('slow_thermometer')).toMatchObject({ id: 'thermo', props: { title: 'Slow Thermometers' } })
    expect(panelForTool('diagonals')?.id).toBe('global')
    expect(panelForTool('digit')).toBeUndefined()
  })

  it('orders grid layers within each slot as the grid stack expects', () => {
    expect(layerIdsForSlot('background')).toEqual(['constraint_backgrounds'])
    expect(layerIdsForSlot('constraint')).toEqual([
      'odd_even_cells', 'min_max', 'diagonals', 'thermometers', 'arrows',
      'killer_cages', 'clone_originals', 'between_lines', 'constraint_lines',
    ])
    expect(layerIdsForSlot('above_regions')).toEqual(['connector_dots'])
    expect(layerIdsForSlot('above_digits')).toEqual(['outer_clues'])
  })

  it('exposes defs by type', () => {
    expect(constraintDef('renban')?.label).toBe('Renban')
    expect(constraintDef('nope')).toBeUndefined()
  })

  it('keeps the derived key unions literal (no widening to string)', () => {
    // If a family factory's return type ever loses a discriminant (type literal,
    // theme presence/family, cellBg presence), these unions silently widen to
    // `string` and every Record keyed by them stops type-checking its keys. Guard
    // at the type level without enumerating the keys.
    type NoWiden<T extends string> = string extends T ? never : true
    const styleKeys: NoWiden<import('./registry').ConstraintStyleKey> = true
    const lineKeys: NoWiden<import('./registry').LineStyleKey> = true
    const shapeKeys: NoWiden<import('./registry').ShapeStyleKey> = true
    const textKeys: NoWiden<import('./registry').TextStyleKey> = true
    const minMaxKeys: NoWiden<import('./registry').MinMaxStyleKey> = true
    const cellBgKeys: NoWiden<import('./registry').CellBgStyleKey> = true
    expect([styleKeys, lineKeys, shapeKeys, textKeys, minMaxKeys, cellBgKeys]).toEqual([true, true, true, true, true, true])
  })
})
