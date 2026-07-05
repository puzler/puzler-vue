import { mdiCircle } from '@mdi/js'
import { defineSingleCellConstraint } from '../define'
import { greyscale } from '../types'

export default defineSingleCellConstraint({
  type: 'odd_cells',
  jsonKey: 'oddCells',
  label: 'Odd',
  pickerLabel: 'Odd Cells',
  themeLabel: 'Odd cell',
  icon: { path: mdiCircle, color: 'rgb(187, 187, 187)' },
  themeFamily: 'shape',
  shapeStyle: { fillColor: greyscale(187), outlineColor: greyscale(187), textColor: greyscale(187), height: 0.75, width: 0.75 },
  excludes: 'even_cells',
  layers: ['odd_even_cells'],
})
