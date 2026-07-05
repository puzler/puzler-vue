import { mdiGamepadCircleOutline } from '@mdi/js'
import { defineConnectorConstraint } from '../define'
import { greyscale } from '../types'

export default defineConnectorConstraint({
  type: 'difference_dots',
  jsonKey: 'differenceDots',
  label: 'Difference',
  pickerLabel: 'Difference Dots',
  themeLabel: 'Difference dot',
  icon: { path: mdiGamepadCircleOutline },
  connector: 'dot',
  themeFamily: 'shape',
  shapeStyle: { fillColor: greyscale(255), outlineColor: greyscale(0), textColor: greyscale(0), height: 0.25, width: 0.25 },
  panelId: 'kropki_dots',
})
