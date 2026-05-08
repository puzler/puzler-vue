import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerConstraint,
  getConstraint,
  getAllConstraints,
  getConstraintsByCategory,
  type ConstraintDefinition,
} from './registry'

const makeConstraint = (overrides: Partial<ConstraintDefinition> = {}): ConstraintDefinition => ({
  type: 'killer_cage',
  category: 'region',
  displayName: 'Killer Cage',
  icon: 'cage',
  renderComponent: null,
  editorFlow: { minCells: 2, maxCells: 9, requiresValue: true, valueLabel: 'Sum' },
  validate: () => true,
  serializeData: (s) => s as Record<string, unknown>,
  deserializeData: (r) => r,
  ...overrides,
})

describe('constraint registry', () => {
  beforeEach(() => {
    // Re-import resets module state only with isolateModules; instead we register
    // under unique type names per test to avoid cross-test pollution.
  })

  it('registers and retrieves a constraint by type', () => {
    const def = makeConstraint({ type: 'test_register' })
    registerConstraint(def)
    expect(getConstraint('test_register')).toBe(def)
  })

  it('returns undefined for an unknown type', () => {
    expect(getConstraint('nonexistent_type')).toBeUndefined()
  })

  it('getAllConstraints includes every registered constraint', () => {
    const def = makeConstraint({ type: 'test_get_all' })
    registerConstraint(def)
    expect(getAllConstraints()).toContain(def)
  })

  it('getConstraintsByCategory filters by category', () => {
    const global = makeConstraint({ type: 'test_global', category: 'global' })
    const line = makeConstraint({ type: 'test_line', category: 'line' })
    registerConstraint(global)
    registerConstraint(line)
    const globals = getConstraintsByCategory('global')
    expect(globals).toContain(global)
    expect(globals).not.toContain(line)
  })

  it('overwriting a type replaces the previous registration', () => {
    const first = makeConstraint({ type: 'test_overwrite', displayName: 'First' })
    const second = makeConstraint({ type: 'test_overwrite', displayName: 'Second' })
    registerConstraint(first)
    registerConstraint(second)
    expect(getConstraint('test_overwrite')?.displayName).toBe('Second')
  })
})
