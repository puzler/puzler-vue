import { mdiGamepadCircleOutline } from '@mdi/js'
import { defineConnectorConstraint } from '../define'
import { greyscale } from '../types'

export default defineConnectorConstraint({
  type: 'quadruples',
  label: 'Quadruple',
  pickerLabel: 'Quadruples',
  icon: { path: mdiGamepadCircleOutline, rotate: 45 },
  connector: 'quadruple',
  themeFamily: 'shape',
  shapeStyle: { fillColor: greyscale(255), outlineColor: greyscale(0), textColor: greyscale(0), height: 0.50, width: 0.50 },
  panelId: 'quadruples',
})
