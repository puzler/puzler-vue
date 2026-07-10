import { mdiSelectGroup } from '@mdi/js'
import { defineConstraint } from '../define'
import { cellsGroup } from '../uniqueness'

// A hidden house: an all-different cell set with no permanent rendering — the
// first-class replacement for the transparent-killer-cage hack. Painted
// through the Grid tool's Houses mode (no picker entry, fog_lights precedent),
// visible only while that tool is active (HouseLayer), free to overlap other
// houses and regions. In the solver a full-digit-range house gets complete
// sudoku semantics (hidden singles etc.), exactly like a painted region.
export default defineConstraint({
  type: 'house',
  label: 'House',
  json: { key: 'houses' },
  // Never shown in a picker (no pickerGroup), but every local tool type
  // carries an icon by invariant.
  icon: { path: mdiSelectGroup },
  toolbox: { category: 'region' },
  layers: ['houses'],
  panel: { id: 'grid' },
  uniqueness: cellsGroup,
} as const)
