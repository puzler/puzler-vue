import { mdiUnfoldMoreVertical } from '@mdi/js'
import { defineSingleCellConstraint } from '../define'
import { greyscale } from '../types'

export default defineSingleCellConstraint({
  type: 'maximums',
  jsonKey: 'maximums',
  label: 'Maximum',
  pickerLabel: 'Maximums',
  icon: { path: mdiUnfoldMoreVertical },
  themeFamily: 'minmax',
  cellBg: greyscale(240),
  excludes: 'minimums',
  layers: ['min_max'],
})
