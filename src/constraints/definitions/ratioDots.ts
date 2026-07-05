import { mdiGamepadCircle } from '@mdi/js'
import { defineConnectorConstraint } from '../define'
import { greyscale } from '../types'

export default defineConnectorConstraint({
  type: 'ratio_dots',
  jsonKey: 'ratioDots',
  label: 'Ratio',
  pickerLabel: 'Ratio Dots',
  themeLabel: 'Ratio dot',
  icon: { path: mdiGamepadCircle },
  connector: 'dot',
  themeFamily: 'shape',
  shapeStyle: { fillColor: greyscale(0), outlineColor: greyscale(0), textColor: greyscale(255), height: 0.25, width: 0.25 },
  panelId: 'kropki_dots',
})
