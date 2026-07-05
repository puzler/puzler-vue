import { mdiDotsSquare } from '@mdi/js'
import { defineRegionConstraint } from '../define'
import { greyscale } from '../types'

export const CAGE_STYLE = {
  textColor: greyscale(0),
  cageColor: greyscale(0),
}

export default defineRegionConstraint({
  type: 'killer_cage',
  jsonKey: 'killerCages',
  label: 'Killer Cage',
  pickerLabel: 'Killer Cages',
  themeLabel: 'Killer cage',
  icon: { path: mdiDotsSquare },
  themeFamily: 'cage',
  layers: ['killer_cages'],
  panelId: 'killer_cage',
})
