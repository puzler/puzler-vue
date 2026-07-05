import { mdiPalette } from '@mdi/js'
import { defineCosmeticConstraint } from '../define'

export default defineCosmeticConstraint({
  type: 'cell_color',
  jsonKey: 'cellColors',
  presetsKey: 'cellColorPresets',
  label: 'Cell color',
  iconPath: mdiPalette,
  panelId: 'cell_color',
})
