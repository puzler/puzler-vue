// Grid layer components for the UI constraint registry, wired by layer id.
//
// Kept separate from registry.ts so the registry stays data-only: only the grid
// components import this module, so layer component code never leaks into chunks that
// just need constraint data (theme store, filter modals). Components are statically
// imported — layers must be available on first render (thumbnails included), so no
// async pop-in.
//
// Adding a constraint that needs a NEW layer: create the component, add its spec to
// LAYER_SPECS in registry.ts, and register it here (one line).

import type { Component } from 'vue'
import { layerIdsForSlot, type ConstraintLayerId, type LayerSlot } from './registry'

import ConstraintBackgrounds from '@/components/grid/ConstraintBackgrounds.vue'
import OddEvenCellsLayer from '@/components/grid/constraints/OddEvenCellsLayer.vue'
import CountingCirclesLayer from '@/components/grid/constraints/CountingCirclesLayer.vue'
import MinMaxLayer from '@/components/grid/constraints/MinMaxLayer.vue'
import DiagonalsLayer from '@/components/grid/constraints/DiagonalsLayer.vue'
import ThermometerLayer from '@/components/grid/constraints/ThermometerLayer.vue'
import ArrowLayer from '@/components/grid/constraints/ArrowLayer.vue'
import KillerCageLayer from '@/components/grid/constraints/KillerCageLayer.vue'
import CloneOriginalsLayer from '@/components/grid/constraints/CloneOriginalsLayer.vue'
import BetweenLinesLayer from '@/components/grid/constraints/BetweenLinesLayer.vue'
import LockoutLinesLayer from '@/components/grid/constraints/LockoutLinesLayer.vue'
import ConstraintLinesLayer from '@/components/grid/constraints/ConstraintLinesLayer.vue'
import ConnectorDotsLayer from '@/components/grid/constraints/ConnectorDotsLayer.vue'
import OuterCluesLayer from '@/components/grid/constraints/OuterCluesLayer.vue'

const LAYER_COMPONENTS: Record<ConstraintLayerId, Component> = {
  constraint_backgrounds: ConstraintBackgrounds,
  odd_even_cells:   OddEvenCellsLayer,
  counting_circles: CountingCirclesLayer,
  min_max:          MinMaxLayer,
  diagonals:        DiagonalsLayer,
  thermometers:     ThermometerLayer,
  arrows:           ArrowLayer,
  killer_cages:     KillerCageLayer,
  clone_originals:  CloneOriginalsLayer,
  between_lines:    BetweenLinesLayer,
  lockout_lines:    LockoutLinesLayer,
  constraint_lines: ConstraintLinesLayer,
  connector_dots:   ConnectorDotsLayer,
  outer_clues:      OuterCluesLayer,
}

export interface ConstraintLayerEntry {
  id: ConstraintLayerId
  component: Component
}

// Render list for one slot in the grid stack, in registry order.
export function constraintLayersForSlot(slot: LayerSlot): ConstraintLayerEntry[] {
  return layerIdsForSlot(slot).map((id) => ({ id, component: LAYER_COMPONENTS[id] }))
}
