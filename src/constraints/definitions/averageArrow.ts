import { mdiArrowTopRightThinCircleOutline } from '@mdi/js'
import { defineConstraint } from '../define'

// Arrow-family one-off: shares arrow's draw machinery, layer and panel. Renders
// like an arrow plus a dashed circle inset inside the bulb; bulbs are always a
// single cell (the digit is an average, never a multi-digit number).

export const AVERAGE_ARROW_STYLE = {
  // Distance from the bulb outline to the dashed inner ring.
  bulbInset: 5,
}

export default defineConstraint({
  type: 'average_arrow',
  json: { key: 'averageArrows' },
  label: 'Average Arrow',
  toolbox: { category: 'line', pickerLabel: 'Average Arrows', pickerGroup: 'multi_cell' },
  filter: { group: 'Lines', order: 4 },
  icon: { path: mdiArrowTopRightThinCircleOutline },
  theme: { family: 'arrow', category: 'lines' },
  draw: 'arrow',
  layers: ['arrows'],
  panel: { id: 'arrow', props: { title: 'Average Arrows' } },
})
