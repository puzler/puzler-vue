import { mdiTextureBox } from '@mdi/js'
import { defineRegionConstraint } from '../define'
import { greyscale } from '../types'
import { cellsGroup } from '../uniqueness'

export default defineRegionConstraint({
  type: 'extra_regions',
  jsonKey: 'extraRegions',
  label: 'Extra Region',
  pickerLabel: 'Extra Regions',
  themeLabel: 'Extra region',
  icon: { path: mdiTextureBox },
  themeFamily: 'cellBg',
  cellBg: greyscale(221),
  layers: ['constraint_backgrounds'],
  panelId: 'extra_regions',
  uniqueness: cellsGroup,
})
