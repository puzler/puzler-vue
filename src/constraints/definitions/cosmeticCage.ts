import { mdiDotsSquare } from '@mdi/js'
import { defineCosmeticConstraint } from '../define'

export default defineCosmeticConstraint({
  type: 'cosmetic_cage',
  jsonKey: 'cages',
  presetsKey: 'cagePresets',
  label: 'Cage',
  iconPath: mdiDotsSquare,
  panelId: 'cosmetic_cage',
})
