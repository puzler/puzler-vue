import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import {
  serializePuzzle, serializePlayDefinition, deserializePuzzle, parsePuzzleImport,
  PUZZLE_EXPORT_VERSION,
} from './puzzleExport'
import type { SerializedPuzzle } from './puzzleExport'
import { migratePuzzleDocument } from './puzzleMigrate'

// The document is user-facing (raw JSON editor): 1-indexed cells, one camelCase
// key per constraint type under `constraints`/`cosmetics`/`globals` (presence =
// active chip), arrays for placed objects, maps only for per-cell values.

// A store pair populated with one of most constraint shapes; the doc-side
// expectations below are the pinned v4 encodings of exactly this state.
function populatedStores() {
  const editor = useEditorStore()
  const grid = useGridStore()
  editor.puzzleName = 'Test Puzzle'
  editor.givenDigits = { r0c0: 5 }
  editor.activeTypes = new Set([
    'odd_cells', 'maximums', 'difference_dots', 'quadruples', 'xv',
    'x_sums', 'little_killers', 'rossini', 'thermometer', 'killer_cage', 'anti_kropki',
  ])
  editor.singleCellMarks = {
    odd_cells: new Set(['r2c2', 'r1c1']),
    maximums: new Set(['r3c3']),
  }
  editor.connectorDots = [
    { id: 'd1', type: 'difference_dots', location: 'r0c0|r0c1', value: 3 },
    { id: 'd2', type: 'quadruples', location: '+r4c4', value: [1, 1, 2] },
    { id: 'd3', type: 'xv', location: 'r5c5|r5c6', value: 'V' },
  ]
  editor.outerClues = [
    { id: 'c1', type: 'x_sums', location: 'o:r-1c3', value: 15 },
    { id: 'c2', type: 'little_killers', location: 'o:r-1c-1', value: 30, direction: 'down-right' },
    { id: 'c3', type: 'rossini', location: 'o:r9c2', value: null, rossiniDirection: 'decreasing' },
  ]
  editor.cosmeticInstances = [
    {
      id: 't1',
      type: 'thermometer',
      data: { root: 'r0c0', edges: [{ from: 'r0c0', to: 'r0c1' }, { from: 'r0c1', to: 'r1c1' }, { from: 'r0c1', to: 'r0c2' }] },
    },
    { id: 'k1', type: 'killer_cage', data: { cells: ['r2c0', 'r2c1'], sum: 10 } },
  ]
  editor.activeGlobalVariants = new Set(['nonconsecutive'])
  editor.customGlobalConstraints = [{ id: 'g1', type: 'anti_diff', value: 4 }]
  return { editor, grid }
}

describe('serializePuzzle (format v4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('groups constraints by document key with 1-indexed cells', () => {
    const { editor, grid } = populatedStores()
    const data = serializePuzzle(editor, grid)

    expect(data.formatVersion).toBe(PUZZLE_EXPORT_VERSION)
    expect(data.givenDigits).toEqual({ r1c1: 5 })
    expect(data.constraints).toEqual({
      thermometers: [{ bulb: 'r1c1', lines: [['r1c1', 'r1c2', 'r2c2'], ['r1c2', 'r1c3']] }],
      killerCages: [{ cells: ['r3c1', 'r3c2'], sum: 10 }],
      differenceDots: [{ cells: ['r1c1', 'r1c2'], value: 3 }],
      xv: [{ cells: ['r6c6', 'r6c7'], value: 'V' }],
      quadruples: [{ cells: ['r4c4', 'r4c5', 'r5c4', 'r5c5'], values: [1, 1, 2] }],
      oddCells: ['r2c2', 'r3c3'],
      maximums: ['r4c4'],
      xSums: [{ cell: 'r0c4', value: 15 }],
      littleKillers: [{ cell: 'r0c0', value: 30, direction: 'down-right' }],
      rossini: [{ cell: 'r10c3', direction: 'decreasing' }],
    })
    expect(data.globals).toEqual({
      antiKropki: { white: true, differences: [4] },
    })
    // No instance/chip UUIDs anywhere in the document.
    expect(JSON.stringify(data)).not.toMatch(/"id":/)
  })

  it('keeps active-but-empty chips as empty entries (presence = active)', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.activeTypes = new Set(['thermometer', 'odd_cells', 'diagonals', 'cosmetic_line'])
    const data = serializePuzzle(editor, grid)
    expect(data.constraints).toEqual({ thermometers: [], oddCells: [] })
    expect(data.globals).toEqual({ diagonals: {} })
    expect((data.cosmetics as Record<string, unknown>).lines).toEqual([])
    // Presets ship alongside their kind key (the tool needs one to draw with).
    expect((data.cosmetics as Record<string, unknown>).linePresets).toBeDefined()
  })

  it('serializes keys in registry-canonical order regardless of add order', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.activeTypes = new Set(['killer_cage', 'renban', 'thermometer'])
    const data = serializePuzzle(editor, grid)
    expect(Object.keys(data.constraints as object)).toEqual(['renbanLines', 'thermometers', 'killerCages'])
  })

  it('canonicalizes preset ids to positional slugs and rewrites references', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.activeTypes = new Set(['cosmetic_line', 'cell_color'])
    editor.addLinePreset()
    const [first, second] = editor.linePresets
    editor.cosmeticInstances = [
      { id: 'l1', type: 'cosmetic_line', data: { cells: ['r0c0', 'r0c1'], presetId: second.id } },
    ]
    editor.cosmeticCellColors = { r0c5: editor.cellColorPresets[0].id }

    const cosmetics = serializePuzzle(editor, grid).cosmetics as Record<string, unknown>
    expect((cosmetics.linePresets as Array<{ id: string }>).map((p) => p.id)).toEqual(['line-1', 'line-2'])
    expect(cosmetics.lines).toEqual([{ cells: ['r1c1', 'r1c2'], preset: 'line-2' }])
    expect(cosmetics.cellColors).toEqual({ r1c6: 'color-1' })
    expect(first.id).not.toBe('line-1') // the store keeps its runtime ids
  })

  it('drops sizeLinked from shape presets (derived on load)', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.activeTypes = new Set(['shape'])
    const cosmetics = serializePuzzle(editor, grid).cosmetics as Record<string, unknown>
    const style = (cosmetics.shapePresets as Array<{ style: Record<string, unknown> }>)[0].style
    expect('sizeLinked' in style).toBe(false)
    expect(style.width).toBeDefined()
  })

  it('serializes regions region-first and omits the standard layout', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.givenDigits = { r0c0: 1 }
    expect(serializePuzzle(editor, grid).grid.regions).toBeUndefined()

    // A sparse override map that happens to equal the standard layout is
    // canonicalized away too.
    grid.setCustomCellRegions({ r0c0: '1' })
    expect(serializePuzzle(editor, grid).grid.regions).toBeUndefined()

    // Excluding a cell from regions produces the full explicit layout, with
    // the excluded cell listed nowhere.
    grid.setCustomCellRegions({ r0c0: null })
    const regions = serializePuzzle(editor, grid).grid.regions!
    expect(Object.keys(regions)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
    expect(regions['1']).not.toContain('r1c1')
    expect(regions['1']).toHaveLength(8)
    expect(regions['2']).toHaveLength(9)
    expect(regions['2'][0]).toBe('r1c4')
  })

  it('omits empty sections and unset fields for a bare puzzle', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.givenDigits = { r0c0: 5 }
    const data = serializePuzzle(editor, grid) as unknown as Record<string, unknown>
    expect(Object.keys(data).sort()).toEqual(['formatVersion', 'givenDigits', 'grid'])
  })

  it('round-trips through JSON text without loss', () => {
    const { editor, grid } = populatedStores()
    const data = serializePuzzle(editor, grid)
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })
})

describe('serializePlayDefinition', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('strips the solution and solve message from the play-safe definition', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.solution = { r0c0: 5 }
    editor.solveMessage = 'secret clue'
    const def = serializePlayDefinition(editor, grid)
    expect(def.solution).toBeUndefined()
    expect(def.meta?.solveMessage).toBeUndefined()
  })
})

describe('deserializePuzzle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('round-trips serialize → JSON → deserialize → serialize with no loss', () => {
    const { editor, grid } = populatedStores()
    editor.puzzleRules = 'Normal sudoku rules.'
    editor.solveMessage = 'The keyword is CIPHER'
    editor.solution = { r0c0: 5, r1c1: 3 }
    grid.setCustomCellRegions({ r0c0: null })

    const original = JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))

    setActivePinia(createPinia())
    const editor2 = useEditorStore()
    const grid2 = useGridStore()
    deserializePuzzle(editor2, grid2, original)

    expect(editor2.solution).toEqual({ r0c0: 5, r1c1: 3 })
    expect(editor2.solveMessage).toBe('The keyword is CIPHER')
    expect(editor2.givenDigits).toEqual({ r0c0: 5 })
    expect(grid2.cellRegionLabelMap.get('r0c0')).toBeNull()
    expect(JSON.parse(JSON.stringify(serializePuzzle(editor2, grid2)))).toEqual(original)
  })

  it('rebuilds active chips from key presence, including empty entries', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, {
      formatVersion: 4,
      grid: { rows: 9, cols: 9 },
      constraints: { thermometers: [], oddCells: ['r2c2'] },
      globals: { chess: { knight: true } },
    })
    expect(editor.activeTypes).toEqual(new Set(['thermometer', 'odd_cells', 'chess']))
    expect(editor.activeGlobalVariants).toEqual(new Set(['knights_move']))
    expect(editor.singleCellMarks.odd_cells).toEqual(new Set(['r1c1']))
  })

  it('hydrates stacked same-location connectors from a hand-authored document', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, {
      formatVersion: 4,
      grid: { rows: 9, cols: 9 },
      constraints: {
        differenceDots: [
          { cells: ['r1c1', 'r1c2'], value: 1 },
          { cells: ['r1c1', 'r1c2'], value: 2 },
        ],
      },
    })
    expect(editor.connectorDots).toHaveLength(2)
    expect(editor.connectorDots.map((d) => d.location)).toEqual(['r0c0|r0c1', 'r0c0|r0c1'])
    expect(editor.connectorAt('r0c0|r0c1')?.value).toBe(2)
  })

  it('restores fields when handed a reactive proxy (import modal path)', () => {
    const data = parsePuzzleImport(JSON.stringify({
      formatVersion: 4,
      grid: { rows: 8, cols: 8 },
      givenDigits: { r2c2: 7 },
      constraints: {
        xv: [{ cells: ['r1c1', 'r1c2'], value: 'V' }, { cells: ['r8c1', 'r8c2'], value: 'X' }],
        xSums: [{ cell: 'r0c4', value: 15 }],
      },
    }))
    const reactiveData = ref(data)

    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, reactiveData.value)

    expect(editor.givenDigits).toEqual({ r1c1: 7 })
    expect(editor.connectorDots).toHaveLength(2)
    expect(editor.connectorDots.find((d) => d.location === 'r7c0|r7c1')).toMatchObject({ type: 'xv', value: 'X' })
    expect(editor.outerClues[0]).toMatchObject({ type: 'x_sums', location: 'o:r-1c3', value: 15 })
  })

  it('handles a minimal pruned object (only version + grid + givens)', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, { formatVersion: 4, grid: { rows: 9, cols: 9 }, givenDigits: { r1c1: 7 } })
    expect(grid.rows).toBe(9)
    expect(editor.givenDigits).toEqual({ r0c0: 7 })
    expect(editor.solution).toBeNull()
    expect(editor.linePresets.length).toBeGreaterThan(0) // default preset preserved
  })
})

describe('migratePuzzleDocument (v3 → v4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // A realistic v3 export: buckets, location-keyed maps, UUIDs, 0-indexed keys.
  const V3_DOC = {
    formatVersion: 3,
    grid: { rows: 9, cols: 9, customCellRegions: { r0c0: null } },
    meta: { name: 'Old Puzzle', rules: 'Rules.' },
    givenDigits: { r0c0: 5 },
    activeConstraints: [
      { id: 'u1', type: 'thermometer', label: 'Thermometers', category: 'line' },
      { id: 'u2', type: 'x_sums', label: 'X-Sums', category: 'outer' },
      { id: 'u3', type: 'anti_xv', label: 'Anti-XV', category: 'global' },
      { id: 'u4', type: 'cosmetic_line', label: 'Line', category: 'cosmetic' },
    ],
    globals: { variants: ['anti_x'], custom: [{ id: 'u5', type: 'anti_sum', value: 12 }] },
    constraints: {
      singleCellMarks: { odd_cells: ['r1c1'] },
      connectorDots: {
        'r4c4|r4c5': { type: 'difference_dots', value: 2 },
        '+r3c3': { type: 'quadruples', value: [1, 2] },
      },
      outerClues: {
        'o:r-1c3': { type: 'x_sums', value: 20 },
        'o:r9c2': { type: 'rossini', value: null, rossiniDirection: 'increasing' },
      },
    },
    cosmetics: {
      cellColors: { r0c5: 'cp1' },
      cellColorPresets: [{ id: 'cp1', label: 'Yellow', color: '#fff9c4' }],
      instances: [
        { id: 'u6', type: 'thermometer', data: { root: 'r0c0', edges: [{ from: 'r0c0', to: 'r0c1' }] } },
        { id: 'u7', type: 'cosmetic_line', data: { cells: ['r6c0', 'r6c1'], presetId: 'lp1' } },
      ],
      linePresets: [{ id: 'lp1', label: 'Grey', style: { color: '#777777', strokeWidth: 8, opacity: 1 } }],
    },
  } as unknown as SerializedPuzzle

  it('converts a v3 document to the v4 shape', () => {
    const doc = migratePuzzleDocument(V3_DOC)
    expect(doc.formatVersion).toBe(4)
    expect(doc.givenDigits).toEqual({ r1c1: 5 })
    expect(doc.grid.regions?.['1']).not.toContain('r1c1')
    expect(doc.constraints).toEqual({
      thermometers: [{ bulb: 'r1c1', lines: [['r1c1', 'r1c2']] }],
      differenceDots: [{ cells: ['r5c5', 'r5c6'], value: 2 }],
      quadruples: [{ cells: ['r3c3', 'r3c4', 'r4c3', 'r4c4'], values: [1, 2] }],
      oddCells: ['r2c2'],
      xSums: [{ cell: 'r0c4', value: 20 }],
      rossini: [{ cell: 'r10c3', direction: 'increasing' }],
    })
    expect(doc.globals).toEqual({ antiXv: { x: true, sums: [12] } })
    const cosmetics = doc.cosmetics as Record<string, unknown>
    expect(cosmetics.lines).toEqual([{ cells: ['r7c1', 'r7c2'], preset: 'line-1' }])
    expect(cosmetics.cellColors).toEqual({ r1c6: 'color-1' })
    expect(JSON.stringify(doc)).not.toMatch(/"id":"u/)
  })

  it('is idempotent: v4 input is returned untouched', () => {
    const migrated = migratePuzzleDocument(V3_DOC)
    expect(migratePuzzleDocument(migrated)).toBe(migrated)
  })

  it('hydrates a v3 document transparently (all load paths migrate)', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, V3_DOC)
    expect(editor.givenDigits).toEqual({ r0c0: 5 })
    expect(editor.connectorDots.find((d) => d.type === 'difference_dots')?.location).toBe('r4c4|r4c5')
    expect(editor.outerClues.find((c) => c.type === 'rossini')?.rossiniDirection).toBe('increasing')
    expect(editor.activeTypes.has('anti_xv')).toBe(true)
    expect(editor.customGlobalConstraints[0]).toMatchObject({ type: 'anti_sum', value: 12 })
  })

  it('migrates legacy v2-era blobs with cell-anchored text and preset size', () => {
    const legacy = {
      version: 2,
      grid: { rows: 9, cols: 9 },
      activeConstraints: [{ id: 'x', type: 'text', label: 'Text', category: 'cosmetic' }],
      cosmetics: {
        instances: [{ id: 't', type: 'text', data: { cell: 'r4c4', anchor: 'top-left', presetId: 'tp1' } }],
        textPresets: [{ id: 'tp1', label: 'Label', content: 'A', style: { color: '#333333', fontSize: 20, bold: false } }],
        shapePresets: [{ id: 'sp1', label: 'Circle', style: { shapeType: 'circle', fillColor: 'none', strokeColor: '#333', strokeWidth: 2, size: 0.4, textColor: '#333', textSize: 20 } }],
      },
    } as unknown as SerializedPuzzle
    const doc = migratePuzzleDocument(legacy)
    const cosmetics = doc.cosmetics as Record<string, unknown>
    // Legacy cell+anchor resolves to a free position (doc coordinates: cell
    // r5c5's centre is x 5.5, top-left anchor shifts -0.5 each way).
    expect(cosmetics.texts).toEqual([{ pos: { x: 5, y: 5 }, content: 'A', preset: 'text-1' }])
    const shapeStyle = (cosmetics.shapePresets as Array<{ style: Record<string, unknown> }> | undefined)?.[0]?.style
    // shapePresets only ship when the shape kind is active — legacy blob had
    // no shape chip, so they are dropped (matching the old preset gating).
    expect(shapeStyle).toBeUndefined()
  })
})

describe('per-instance setter colors (format v4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // One colored instance per category; the pinned encoding below is exactly
  // this state. populatedStores above stays untouched, proving colors are
  // omitted when unset.
  function coloredStores() {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.activeTypes = new Set([
      'renban', 'thermometer', 'killer_cage', 'difference_dots', 'little_killers',
      'odd_cells', 'maximums', 'clone', 'extra_regions',
    ])
    editor.cosmeticInstances = [
      { id: 'l1', type: 'renban', data: { cells: ['r0c0', 'r1c0'], color: '#ff000080' } },
      {
        id: 't1',
        type: 'thermometer',
        data: { root: 'r0c0', edges: [{ from: 'r0c0', to: 'r0c1' }], color: '#123456', bulbColor: '#654321' },
      },
      { id: 'k1', type: 'killer_cage', data: { cells: ['r2c0', 'r2c1'], sum: 10, cageColor: '#00ff00', textColor: '#0000ff' } },
      { id: 'x1', type: 'extra_regions', data: { cells: ['r5c5'], color: '#22222240' } },
      { id: 'c1', type: 'clone', data: { cells: ['r6c6'], copies: [{ dRow: 1, dCol: 1 }], color: '#abcdef' } },
    ]
    editor.connectorDots = [
      { id: 'd1', type: 'difference_dots', location: 'r0c0|r0c1', value: 3, color: '#ff8800', textColor: '#ffffff' },
    ]
    editor.outerClues = [
      { id: 'o1', type: 'little_killers', location: 'o:r-1c-1', value: 30, direction: 'down-right', arrowColor: '#808080' },
    ]
    editor.singleCellMarks = { odd_cells: new Set(['r1c1']), maximums: new Set(['r3c3']) }
    editor.singleCellMarkColors = {
      odd_cells: { r1c1: { color: '#99999980' } },
      maximums: { r3c3: { backgroundColor: '#101010', chevronColor: '#fafafa' } },
    }
    return { editor, grid }
  }

  it('pins the doc encoding: colors ride each instance, plain marks stay strings', () => {
    const { editor, grid } = coloredStores()
    const data = serializePuzzle(editor, grid)
    expect(data.constraints).toEqual({
      renbanLines: [{ cells: ['r1c1', 'r2c1'], color: '#ff000080' }],
      thermometers: [{ bulb: 'r1c1', lines: [['r1c1', 'r1c2']], color: '#123456', bulbColor: '#654321' }],
      differenceDots: [{ cells: ['r1c1', 'r1c2'], value: 3, color: '#ff8800', textColor: '#ffffff' }],
      oddCells: [{ cell: 'r2c2', color: '#99999980' }],
      maximums: [{ cell: 'r4c4', backgroundColor: '#101010', chevronColor: '#fafafa' }],
      killerCages: [{ cells: ['r3c1', 'r3c2'], sum: 10, cageColor: '#00ff00', textColor: '#0000ff' }],
      extraRegions: [{ cells: ['r6c6'], color: '#22222240' }],
      clones: [{ cells: ['r7c7'], copies: [{ dRow: 1, dCol: 1 }], color: '#abcdef' }],
      littleKillers: [{ cell: 'r0c0', value: 30, direction: 'down-right', arrowColor: '#808080' }],
    })
  })

  it('round-trips instance colors with no loss', () => {
    const { editor, grid } = coloredStores()
    const original = JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))

    setActivePinia(createPinia())
    const editor2 = useEditorStore()
    const grid2 = useGridStore()
    deserializePuzzle(editor2, grid2, original)

    expect(editor2.singleCellMarkColors).toEqual({
      odd_cells: { r1c1: { color: '#99999980' } },
      maximums: { r3c3: { backgroundColor: '#101010', chevronColor: '#fafafa' } },
    })
    expect(editor2.connectorDots[0]).toMatchObject({ color: '#ff8800', textColor: '#ffffff' })
    expect(editor2.outerClues[0]).toMatchObject({ arrowColor: '#808080' })
    expect(JSON.parse(JSON.stringify(serializePuzzle(editor2, grid2)))).toEqual(original)
  })

  it('hydrates mixed plain and colored single-cell entries', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, {
      formatVersion: 4,
      grid: { rows: 9, cols: 9 },
      constraints: { oddCells: ['r1c1', { cell: 'r2c2', color: '#ff0000' }] as unknown as string[] },
    })
    expect(editor.singleCellMarks.odd_cells).toEqual(new Set(['r0c0', 'r1c1']))
    expect(editor.singleCellMarkColors).toEqual({ odd_cells: { r1c1: { color: '#ff0000' } } })
  })

  it('ignores color fields a type does not accept', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, {
      formatVersion: 4,
      grid: { rows: 9, cols: 9 },
      constraints: { renbanLines: [{ cells: ['r1c1', 'r2c1'], cageColor: '#ff0000' }] },
    })
    const data = (editor.cosmeticInstances[0].data ?? {}) as Record<string, unknown>
    expect(data.cageColor).toBeUndefined()
    const doc = serializePuzzle(editor, grid)
    expect((doc.constraints as Record<string, unknown>).renbanLines).toEqual([{ cells: ['r1c1', 'r2c1'] }])
  })
})
