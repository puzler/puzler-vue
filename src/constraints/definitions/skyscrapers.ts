import { mdiDomain } from '@mdi/js'
import { defineOuterClueConstraint } from '../define'

export default defineOuterClueConstraint({
  type: 'skyscrapers',
  jsonKey: 'skyscrapers',
  label: 'Skyscraper',
  pickerLabel: 'Skyscrapers',
  iconPath: mdiDomain,
  textSize: 0.65,
})
