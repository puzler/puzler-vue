import { mdiMapMarkerOutline } from '@mdi/js'
import { defineSingleCellConstraint } from '../define'

export default defineSingleCellConstraint({
  type: 'col_index_cells',
  jsonKey: 'colIndexCells',
  label: 'Column Index',
  pickerLabel: 'Column Index Cells',
  themeLabel: 'Column index cell',
  icon: { path: mdiMapMarkerOutline },
  themeFamily: 'cellBg',
  cellBg: { red: 180, green: 235, blue: 195, opacity: 0.7 },
})
