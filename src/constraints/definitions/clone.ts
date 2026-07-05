import { mdiCheckboxMultipleBlank } from '@mdi/js'
import { defineRegionConstraint } from '../define'
import { greyscale } from '../types'

export default defineRegionConstraint({
  type: 'clone',
  jsonKey: 'clones',
  label: 'Clone',
  pickerLabel: 'Clones',
  icon: { path: mdiCheckboxMultipleBlank },
  themeFamily: 'cellBg',
  cellBg: greyscale(204),
  layers: ['constraint_backgrounds', 'clone_originals'],
  panelId: 'clone',
})
