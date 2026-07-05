import { mdiBreadSlice } from '@mdi/js'
import { defineOuterClueConstraint } from '../define'

export default defineOuterClueConstraint({
  type: 'sandwich_sums',
  jsonKey: 'sandwichSums',
  label: 'Sandwich',
  pickerLabel: 'Sandwich Sums',
  themeLabel: 'Sandwich sum',
  iconPath: mdiBreadSlice,
  textSize: 0.65,
})
