import { mdiWall } from '@mdi/js'
import { defineCosmeticConstraint } from '../define'

// Styled segments along interior cell edges. The default preset matches the
// thick region-border stroke, so setters can draw fake "region" boundaries on
// rules-off grids (more than 10 visual regions) or walls that separate
// nothing. Purely visual — never reaches the solver.
export default defineCosmeticConstraint({
  type: 'cosmetic_border',
  jsonKey: 'borders',
  presetsKey: 'borderPresets',
  label: 'Border',
  iconPath: mdiWall,
  panelId: 'cosmetic_border',
})
