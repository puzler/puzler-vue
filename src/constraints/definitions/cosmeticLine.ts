import { mdiChartLineVariant } from '@mdi/js'
import { defineCosmeticConstraint } from '../define'

export default defineCosmeticConstraint({
  type: 'cosmetic_line',
  jsonKey: 'lines',
  presetsKey: 'linePresets',
  label: 'Line',
  iconPath: mdiChartLineVariant,
  panelId: 'cosmetic_line',
})
