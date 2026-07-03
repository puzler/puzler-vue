import { mdiCircleOutline } from '@mdi/js'
import { defineSingleCellConstraint } from '../define'
import { greyscale } from '../types'

export default defineSingleCellConstraint({
  type: 'counting_circles',
  label: 'Counting Circles',
  pickerLabel: 'Counting Circles',
  themeLabel: 'Counting circle',
  icon: { path: mdiCircleOutline },
  themeFamily: 'shape',
  // Outline-only ring so the digit inside stays legible.
  shapeStyle: {
    fillColor: { red: 0, green: 0, blue: 0, opacity: 0 },
    outlineColor: greyscale(102),
    textColor: greyscale(0),
    height: 0.8,
    width: 0.8,
  },
  layers: ['counting_circles'],
})
