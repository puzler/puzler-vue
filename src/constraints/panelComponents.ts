// Editor toolbox panels for the UI constraint registry, wired by panel id.
//
// Kept separate from registry.ts so the registry stays data-only: only
// ToolControlBox imports this module, so panel component code never leaks into
// chunks that just need constraint data.
//
// Adding a constraint that needs a NEW panel: create the component, add its id to
// ConstraintPanelId in registry.ts, and register it here (one line). Constraints that
// reuse a shared panel (line_tool, single_cell, outer_clue, kropki_dots, global) just
// reference it from their def.

import type { Component } from 'vue'
import type { ConstraintPanelId } from './registry'

import LineToolPanel from '@/components/editor/toolbox/LineToolPanel.vue'
import ThermoPanel from '@/components/editor/toolbox/ThermoPanel.vue'
import ArrowPanel from '@/components/editor/toolbox/ArrowPanel.vue'
import SingleCellPanel from '@/components/editor/toolbox/SingleCellPanel.vue'
import KropkiDotsPanel from '@/components/editor/toolbox/KropkiDotsPanel.vue'
import XvPanel from '@/components/editor/toolbox/XvPanel.vue'
import InequalityPanel from '@/components/editor/toolbox/InequalityPanel.vue'
import QuadruplesPanel from '@/components/editor/toolbox/QuadruplesPanel.vue'
import KillerCagePanel from '@/components/editor/toolbox/KillerCagePanel.vue'
import ExtraRegionsPanel from '@/components/editor/toolbox/ExtraRegionsPanel.vue'
import ClonePanel from '@/components/editor/toolbox/ClonePanel.vue'
import OuterCluePanel from '@/components/editor/toolbox/OuterCluePanel.vue'
import GlobalConstraintPanel from '@/components/editor/toolbox/GlobalConstraintPanel.vue'
import FogPanel from '@/components/editor/toolbox/FogPanel.vue'
import CosmeticLinePanel from '@/components/editor/toolbox/CosmeticLinePanel.vue'
import CellColorPanel from '@/components/editor/toolbox/CellColorPanel.vue'
import ShapePanel from '@/components/editor/toolbox/ShapePanel.vue'
import TextPanel from '@/components/editor/toolbox/TextPanel.vue'
import CosmeticCagePanel from '@/components/editor/toolbox/CosmeticCagePanel.vue'

export const PANEL_COMPONENTS: Record<ConstraintPanelId, Component> = {
  line_tool:     LineToolPanel,
  thermo:        ThermoPanel,
  arrow:         ArrowPanel,
  single_cell:   SingleCellPanel,
  kropki_dots:   KropkiDotsPanel,
  xv:            XvPanel,
  inequality:    InequalityPanel,
  quadruples:    QuadruplesPanel,
  killer_cage:   KillerCagePanel,
  extra_regions: ExtraRegionsPanel,
  clone:         ClonePanel,
  outer_clue:    OuterCluePanel,
  global:        GlobalConstraintPanel,
  fog:           FogPanel,
  cosmetic_line: CosmeticLinePanel,
  cell_color:    CellColorPanel,
  shape:         ShapePanel,
  text:          TextPanel,
  cosmetic_cage: CosmeticCagePanel,
}
