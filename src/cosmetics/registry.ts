import type { Component } from 'vue'

export type CosmeticType = 'line' | 'cell_color' | 'shape' | 'text'

export type PositionType = 'cell' | 'edge' | 'corner'

export interface CosmeticPosition {
  type: PositionType
  cells: string[]
}

export interface CosmeticDefinition {
  type: CosmeticType
  displayName: string
  icon: string
  renderComponent: Component | null
  defaultStyle: Record<string, unknown>
}

const registry = new Map<CosmeticType, CosmeticDefinition>()

export function registerCosmetic(def: CosmeticDefinition): void {
  registry.set(def.type, def)
}

export function getCosmetic(type: CosmeticType): CosmeticDefinition | undefined {
  return registry.get(type)
}

export function getAllCosmetics(): CosmeticDefinition[] {
  return Array.from(registry.values())
}
