import { describe, it, expect } from 'vitest'
import schema from './puzzle-schema.json'
import {
  TYPE_TO_JSON_KEY, PRESETS_KEY_BY_TYPE, GLOBAL_GROUPS_JSON, toolboxCategory,
} from '@/constraints/registry'

// Pins the GENERATED autocomplete schema to the registry's document keys, so
// adding a constraint type without updating schemaTypes.ts + running
// `npm run schema:puzzle` fails here instead of silently shipping stale
// autocomplete. Reading the generated JSON (not the mirror types) validates
// the whole pipeline.

function schemaProps(section: string): string[] {
  const def = (schema.definitions as Record<string, { properties?: Record<string, unknown> }>).SerializedPuzzleSchema
  const node = def.properties?.[section] as { properties?: Record<string, unknown> } | undefined
  return Object.keys(node?.properties ?? {}).sort()
}

const LOCAL_CATEGORIES = new Set(['line', 'single_cell', 'connector', 'region', 'outer'])

describe('puzzle-schema.json registry drift', () => {
  it('lists every local constraint document key', () => {
    const expected = [...TYPE_TO_JSON_KEY.entries()]
      .filter(([type]) => LOCAL_CATEGORIES.has(toolboxCategory(type) ?? ''))
      .map(([, key]) => key)
      .sort()
    expect(schemaProps('constraints')).toEqual(expected)
  })

  it('lists every cosmetic kind and its presets key', () => {
    const expected = [...TYPE_TO_JSON_KEY.entries()]
      .filter(([type]) => toolboxCategory(type) === 'cosmetic')
      .flatMap(([type, key]) => [key, PRESETS_KEY_BY_TYPE.get(type)!])
      .sort()
    expect(schemaProps('cosmetics')).toEqual(expected)
  })

  it('lists every globals group with its toggles and custom value fields', () => {
    expect(schemaProps('globals')).toEqual(GLOBAL_GROUPS_JSON.map((g) => g.key).sort())
    const def = (schema.definitions as Record<string, { properties?: Record<string, { properties?: Record<string, unknown> }> }>).SerializedPuzzleSchema
    for (const group of GLOBAL_GROUPS_JSON) {
      const node = def.properties?.globals as { properties?: Record<string, { properties?: Record<string, unknown> }> } | undefined
      const fields = Object.keys(node?.properties?.[group.key]?.properties ?? {}).sort()
      const expected = [...group.variants.map((v) => v.key), ...Object.keys(group.customValues)].sort()
      expect(fields, group.key).toEqual(expected)
    }
  })
})
