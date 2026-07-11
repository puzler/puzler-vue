import { describe, it, expect } from 'vitest'
import {
  CONSTRAINT_LINE_TYPES, UNBRANCHABLE_LINE_TYPES, THERMO_TYPES, ARROW_TYPES, CONNECTOR_DOT_TYPES, BORDER_CONNECTOR_TYPES,
  OUTER_CLUE_TYPES, SINGLE_CELL_TYPES, LOCAL_TOOL_TYPES,
  SINGLE_CELL_EXCLUSIONS, GLOBAL_VARIANT_EXCLUSIONS, GLOBAL_VARIANTS,
  CONSTRAINT_ICONS, CONSTRAINT_STYLE_REGISTRY, CONSTRAINT_FILTER_GROUPS,
  LOCAL_PICKER_GROUPS, pickerOptionsFor, panelForTool, toolboxCategory,
  layerIdsForSlot, constraintDef,
  TYPE_TO_JSON_KEY, JSON_KEY_TO_TYPE, PRESETS_KEY_BY_TYPE, GLOBAL_GROUPS_JSON,
} from './registry'

// The registry replaced hand-maintained literals spread across ~10 files. These tests
// pin the derived structures to the exact values those literals had, so a def edit
// that would silently change membership, grouping or dispatch fails loudly here.

describe('constraint registry derivations', () => {
  it('derives the draw-tool membership sets', () => {
    expect(CONSTRAINT_LINE_TYPES).toEqual(new Set(['renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum', 'entropic_lines', 'modular_lines', 'nabner_lines', 'zipper_lines', 'between_lines', 'lockout_lines']))
    expect(UNBRANCHABLE_LINE_TYPES).toEqual(new Set(['lockout_lines']))
    expect(THERMO_TYPES).toEqual(new Set(['thermometer', 'slow_thermometer']))
    expect(ARROW_TYPES).toEqual(new Set(['arrow', 'average_arrow']))
    expect(CONNECTOR_DOT_TYPES).toEqual(new Set(['difference_dots', 'ratio_dots']))
    expect(BORDER_CONNECTOR_TYPES).toEqual(new Set(['difference_dots', 'ratio_dots', 'xv', 'inequality', 'quadruples']))
    expect(OUTER_CLUE_TYPES).toEqual(new Set(['x_sums', 'sandwich_sums', 'skyscrapers', 'little_killers', 'numbered_rooms', 'battlefield', 'next_to_nine', 'rossini']))
    expect(SINGLE_CELL_TYPES).toEqual(new Set(['odd_cells', 'even_cells', 'minimums', 'maximums', 'counting_circles', 'row_index_cells', 'col_index_cells', 'fog_lights']))
    expect(LOCAL_TOOL_TYPES.size).toBe(40)
    expect(LOCAL_TOOL_TYPES.has('house')).toBe(true)
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
    expect(Object.keys(GLOBAL_VARIANTS)).toEqual(['sudoku_rules', 'diagonals', 'chess', 'anti_kropki', 'anti_xv', 'disjoint_sets', 'fog'])
    expect(GLOBAL_VARIANTS.sudoku_rules).toEqual([{ type: 'sudoku_custom_houses', label: 'Custom houses' }])
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
      'cosmetic_line', 'cosmetic_border', 'cell_color', 'shape', 'text', 'cosmetic_cage']) {
      expect(CONSTRAINT_ICONS[type], type).toBeDefined()
    }
    // Line icons take their color from the def's line style (one source of truth).
    expect(CONSTRAINT_ICONS.renban.color).toBe('rgba(240, 103, 240, 1)')
    expect(CONSTRAINT_ICONS.between_lines.color).toBeUndefined()
    expect(CONSTRAINT_ICONS.quadruples.rotate).toBe(45)
  })

  it('derives the theme style registry with all 42 themeable keys', () => {
    const keys = Object.keys(CONSTRAINT_STYLE_REGISTRY)
    expect(keys).toHaveLength(42)
    expect(CONSTRAINT_STYLE_REGISTRY.german_whispers).toEqual({ family: 'line', category: 'lines', label: 'German whispers' })
    expect(CONSTRAINT_STYLE_REGISTRY.renban.label).toBe('Renban')
    expect(CONSTRAINT_STYLE_REGISTRY.positive_diagonal.family).toBe('diagonal')
    expect(CONSTRAINT_STYLE_REGISTRY.minimums.family).toBe('minmax')
    // Theme-editor order within the lines category is preserved.
    expect(keys.filter(k => CONSTRAINT_STYLE_REGISTRY[k as keyof typeof CONSTRAINT_STYLE_REGISTRY].category === 'lines')).toEqual([
      'renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum',
      'entropic_lines', 'modular_lines', 'nabner_lines', 'zipper_lines', 'between_lines',
      'lockout_lines', 'thermometer', 'slow_thermometer', 'arrow', 'average_arrow',
    ])
  })

  it('derives the archive filter groups with their historical option order', () => {
    expect(CONSTRAINT_FILTER_GROUPS.map(g => g.label)).toEqual([
      'Lines', 'Cells', 'Connectors', 'Cages & Regions', 'Outer Clues', 'Global',
    ])
    const lines = CONSTRAINT_FILTER_GROUPS[0].options.map(o => o.value)
    expect(lines).toEqual([
      'thermometer', 'slow_thermometer', 'arrow', 'average_arrow', 'renban', 'german_whispers',
      'dutch_whispers', 'palindrome', 'region_sum', 'entropic_lines', 'modular_lines',
      'nabner_lines', 'zipper_lines', 'between_lines', 'lockout_lines',
    ])
    const global = CONSTRAINT_FILTER_GROUPS[5].options
    expect(global.map(o => o.value)).toEqual([
      'diagonals', 'kings_move', 'knights_move', 'anti_kropki', 'anti_xv', 'disjoint_sets', 'fog',
    ])
    expect(global[6].label).toBe('Fog of War')
    expect(global[1].label).toBe("King's Move")
  })

  it('derives the local picker groups with plural picker labels', () => {
    expect(LOCAL_PICKER_GROUPS.map(g => g.key)).toEqual([
      'lines', 'single_cell', 'cell_connectors', 'multi_cell', 'outer_clues',
    ])
    const multiCell = LOCAL_PICKER_GROUPS.find(g => g.key === 'multi_cell')!
    expect(multiCell.options.map(o => o.type).sort()).toEqual(
      ['arrow', 'average_arrow', 'clone', 'extra_regions', 'killer_cage', 'slow_thermometer', 'thermometer'],
    )
    expect(multiCell.options.find(o => o.type === 'thermometer')!.label).toBe('Thermometers')
  })

  it('derives sidebar picker options for global and cosmetic categories', () => {
    expect(pickerOptionsFor('global').map(o => o.label)).toEqual([
      'Sudoku Rules', 'Diagonals', 'Chess', 'Anti-Kropki', 'Anti-XV', 'Disjoint Sets', 'Fog of War',
    ])
    expect(pickerOptionsFor('cosmetic').map(o => o.label)).toEqual([
      'Line', 'Border', 'Cell color', 'Shape', 'Text', 'Cage',
    ])
  })

  it('routes toolbox categories and panels', () => {
    expect(toolboxCategory('renban')).toBe('line')
    expect(toolboxCategory('killer_cage')).toBe('region')
    expect(toolboxCategory('kings_move')).toBeUndefined()
    expect(panelForTool('slow_thermometer')).toMatchObject({ id: 'thermo', props: { title: 'Slow Thermometers' } })
    expect(panelForTool('average_arrow')).toMatchObject({ id: 'arrow', props: { title: 'Average Arrows' } })
    expect(panelForTool('diagonals')?.id).toBe('global')
    expect(panelForTool('fog')?.id).toBe('fog')
    expect(panelForTool('fog_lights')?.id).toBe('fog')
    expect(panelForTool('house')?.id).toBe('grid')
    expect(panelForTool('sudoku_rules')?.id).toBe('sudoku_rules')
    expect(panelForTool('digit')).toBeUndefined()
  })

  it('orders grid layers within each slot as the grid stack expects', () => {
    expect(layerIdsForSlot('background')).toEqual(['constraint_backgrounds'])
    expect(layerIdsForSlot('constraint')).toEqual([
      'odd_even_cells', 'counting_circles', 'min_max', 'diagonals', 'thermometers', 'arrows',
      'killer_cages', 'clone_originals', 'between_lines', 'lockout_lines', 'constraint_lines',
    ])
    expect(layerIdsForSlot('above_regions')).toEqual(['houses', 'connector_dots'])
    expect(layerIdsForSlot('above_digits')).toEqual(['outer_clues'])
  })

  it('exposes defs by type', () => {
    expect(constraintDef('renban')?.label).toBe('Renban')
    expect(constraintDef('nope')).toBeUndefined()
  })

  it('derives a document key for every toolbox type, globally unique', () => {
    for (const type of LOCAL_TOOL_TYPES) expect(TYPE_TO_JSON_KEY.get(type), type).toBeDefined()
    for (const type of ['diagonals', 'chess', 'anti_kropki', 'anti_xv', 'disjoint_sets',
      'cosmetic_line', 'cell_color', 'shape', 'text', 'cosmetic_cage']) {
      expect(TYPE_TO_JSON_KEY.get(type), type).toBeDefined()
    }
    // Unique keys keep JSON_KEY_TO_TYPE a true inverse.
    expect(JSON_KEY_TO_TYPE.size).toBe(TYPE_TO_JSON_KEY.size)
    for (const [type, key] of TYPE_TO_JSON_KEY) expect(JSON_KEY_TO_TYPE.get(key)).toBe(type)
  })

  it('pins the document keys the stored format depends on', () => {
    // The backend mirror (api: PuzzleDefinition::JsonKeys) and every stored v4
    // definition depend on these exact strings — renames are format migrations,
    // not refactors.
    expect(Object.fromEntries(TYPE_TO_JSON_KEY)).toEqual({
      renban: 'renbanLines',
      german_whispers: 'germanWhispers',
      dutch_whispers: 'dutchWhispers',
      palindrome: 'palindromes',
      region_sum: 'regionSumLines',
      entropic_lines: 'entropicLines',
      modular_lines: 'modularLines',
      nabner_lines: 'nabnerLines',
      zipper_lines: 'zipperLines',
      between_lines: 'betweenLines',
      lockout_lines: 'lockoutLines',
      thermometer: 'thermometers',
      slow_thermometer: 'slowThermometers',
      arrow: 'arrows',
      average_arrow: 'averageArrows',
      difference_dots: 'differenceDots',
      ratio_dots: 'ratioDots',
      xv: 'xv',
      inequality: 'inequalities',
      quadruples: 'quadruples',
      odd_cells: 'oddCells',
      even_cells: 'evenCells',
      minimums: 'minimums',
      maximums: 'maximums',
      counting_circles: 'countingCircles',
      row_index_cells: 'rowIndexCells',
      col_index_cells: 'colIndexCells',
      killer_cage: 'killerCages',
      extra_regions: 'extraRegions',
      house: 'houses',
      clone: 'clones',
      x_sums: 'xSums',
      sandwich_sums: 'sandwichSums',
      skyscrapers: 'skyscrapers',
      little_killers: 'littleKillers',
      numbered_rooms: 'numberedRooms',
      battlefield: 'battlefield',
      next_to_nine: 'nextToNine',
      rossini: 'rossini',
      sudoku_rules: 'sudokuRules',
      diagonals: 'diagonals',
      chess: 'chess',
      anti_kropki: 'antiKropki',
      anti_xv: 'antiXv',
      disjoint_sets: 'disjointSets',
      fog: 'fog',
      fog_lights: 'fogLights',
      cosmetic_line: 'lines',
      cosmetic_border: 'borders',
      cell_color: 'cellColors',
      shape: 'shapes',
      text: 'texts',
      cosmetic_cage: 'cages',
    })
    expect(Object.fromEntries(PRESETS_KEY_BY_TYPE)).toEqual({
      cosmetic_line: 'linePresets',
      cosmetic_border: 'borderPresets',
      cell_color: 'cellColorPresets',
      shape: 'shapePresets',
      text: 'textPresets',
      cosmetic_cage: 'cagePresets',
    })
  })

  it('derives the globals group document shapes', () => {
    expect(GLOBAL_GROUPS_JSON).toEqual([
      {
        type: 'sudoku_rules',
        key: 'sudokuRules',
        variants: [
          { type: 'sudoku_rules', key: 'enabled' },
          { type: 'sudoku_custom_houses', key: 'custom' },
        ],
        customValues: {},
      },
      {
        type: 'diagonals',
        key: 'diagonals',
        variants: [
          { type: 'positive_diagonal', key: 'positive' },
          { type: 'negative_diagonal', key: 'negative' },
          { type: 'anti_positive_diagonal', key: 'antiPositive' },
          { type: 'anti_negative_diagonal', key: 'antiNegative' },
        ],
        customValues: {},
      },
      {
        type: 'chess',
        key: 'chess',
        variants: [
          { type: 'kings_move', key: 'king' },
          { type: 'knights_move', key: 'knight' },
        ],
        customValues: {},
      },
      {
        type: 'anti_kropki',
        key: 'antiKropki',
        variants: [
          { type: 'nonconsecutive', key: 'white' },
          { type: 'anti_black_kropki', key: 'black' },
        ],
        customValues: { differences: 'anti_diff', ratios: 'anti_ratio' },
      },
      {
        type: 'anti_xv',
        key: 'antiXv',
        variants: [
          { type: 'anti_x', key: 'x' },
          { type: 'anti_v', key: 'v' },
        ],
        customValues: { sums: 'anti_sum' },
      },
      {
        type: 'disjoint_sets',
        key: 'disjointSets',
        variants: [{ type: 'disjoint_sets', key: 'enabled' }],
        customValues: {},
      },
      {
        type: 'fog',
        key: 'fog',
        variants: [{ type: 'fog', key: 'enabled' }],
        customValues: {},
      },
    ])
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
