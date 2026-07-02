import { mdiUnfoldLessVertical } from '@mdi/js'
import { defineSingleCellConstraint } from '../define'
import { greyscale } from '../types'

export default defineSingleCellConstraint({
  type: 'minimums',
  label: 'Minimum',
  pickerLabel: 'Minimums',
  icon: { path: mdiUnfoldLessVertical },
  themeFamily: 'minmax',
  cellBg: greyscale(240),
  excludes: 'maximums',
  layers: ['min_max'],
})
