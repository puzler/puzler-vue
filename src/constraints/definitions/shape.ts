import { mdiShape } from '@mdi/js'
import { defineCosmeticConstraint } from '../define'

export default defineCosmeticConstraint({
  type: 'shape',
  jsonKey: 'shapes',
  presetsKey: 'shapePresets',
  label: 'Shape',
  iconPath: mdiShape,
  panelId: 'shape',
})
