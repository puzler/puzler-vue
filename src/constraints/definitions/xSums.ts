import { mdiNumeric9Plus } from '@mdi/js'
import { defineOuterClueConstraint } from '../define'

export default defineOuterClueConstraint({
  type: 'x_sums',
  label: 'X-Sums',
  themeLabel: 'X-sum',
  iconPath: mdiNumeric9Plus,
  textSize: 0.65,
})
