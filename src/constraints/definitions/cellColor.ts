import { mdiPalette } from '@mdi/js'
import { defineCosmeticConstraint } from '../define'

export default defineCosmeticConstraint({
  type: 'cell_color',
  label: 'Cell color',
  iconPath: mdiPalette,
  panelId: 'cell_color',
})
