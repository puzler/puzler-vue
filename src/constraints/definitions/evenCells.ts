import { mdiSquare } from '@mdi/js'
import { defineSingleCellConstraint } from '../define'
import { greyscale } from '../types'

export default defineSingleCellConstraint({
  type: 'even_cells',
  label: 'Even',
  pickerLabel: 'Even Cells',
  themeLabel: 'Even cell',
  icon: { path: mdiSquare, color: 'rgb(187, 187, 187)' },
  themeFamily: 'shape',
  shapeStyle: { fillColor: greyscale(187), outlineColor: greyscale(187), textColor: greyscale(187), height: 0.70, width: 0.70 },
  excludes: 'odd_cells',
  layers: ['odd_even_cells'],
})
