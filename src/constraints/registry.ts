import type { Component } from 'vue'

export interface ConstraintEditorFlow {
  // How many cells must be selected before the constraint can be confirmed
  minCells: number
  maxCells: number | null
  // Whether the constraint needs a numeric value (e.g., killer cage sum)
  requiresValue: boolean
  valueLabel?: string
}

export interface ConstraintDefinition {
  type: string
  category: 'global' | 'region' | 'line'
  displayName: string
  icon: string
  renderComponent: Component | null
  editorFlow: ConstraintEditorFlow
  validate: (data: unknown, grid: Record<string, number>) => boolean
  serializeData: (editorState: unknown) => Record<string, unknown>
  deserializeData: (raw: Record<string, unknown>) => unknown
}

const registry = new Map<string, ConstraintDefinition>()

export function registerConstraint(def: ConstraintDefinition): void {
  registry.set(def.type, def)
}

export function getConstraint(type: string): ConstraintDefinition | undefined {
  return registry.get(type)
}

export function getAllConstraints(): ConstraintDefinition[] {
  return Array.from(registry.values())
}

export function getConstraintsByCategory(category: ConstraintDefinition['category']): ConstraintDefinition[] {
  return getAllConstraints().filter((c) => c.category === category)
}
