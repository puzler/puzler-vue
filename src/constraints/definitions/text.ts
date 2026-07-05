import { mdiAlphabeticalVariant } from '@mdi/js'
import { defineCosmeticConstraint } from '../define'

export default defineCosmeticConstraint({
  type: 'text',
  jsonKey: 'texts',
  presetsKey: 'textPresets',
  label: 'Text',
  iconPath: mdiAlphabeticalVariant,
  panelId: 'text',
})
