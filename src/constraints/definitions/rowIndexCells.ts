import { mdiMapMarker } from '@mdi/js'
import { defineSingleCellConstraint } from '../define'

export default defineSingleCellConstraint({
  type: 'row_index_cells',
  jsonKey: 'rowIndexCells',
  label: 'Row Index',
  pickerLabel: 'Row Index Cells',
  themeLabel: 'Row index cell',
  icon: { path: mdiMapMarker },
  themeFamily: 'cellBg',
  cellBg: { red: 255, green: 200, blue: 200, opacity: 0.7 },
})
