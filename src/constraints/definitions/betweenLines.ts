import { mdiCircleMultipleOutline } from '@mdi/js'
import { defineConstraint } from '../define'
import { greyscale, colorToCss, type ConstraintShapeStyle } from '../types'

// A line-category one-off: draws through the shared line machinery but renders via
// its own layer (line + end bulbs) and themes as its own family.

// The between-line bulb shape, folded into the render-ready style below.
const BETWEEN_BULB: ConstraintShapeStyle = {
  fillColor: greyscale(255), outlineColor: greyscale(187), textColor: greyscale(0), height: 0.80, width: 0.80,
}

export const BETWEEN_LINE_STYLE = {
  lineColor:         colorToCss(greyscale(187)),
  lineStrokeWidth:   2,
  circleRadius:      Math.round(BETWEEN_BULB.width * 64 / 2), // 0.8 * 64 / 2 = 26
  circleFill:        colorToCss(BETWEEN_BULB.fillColor),
  circleStrokeColor: colorToCss(BETWEEN_BULB.outlineColor),
  circleStrokeWidth: 2,
}

export default defineConstraint({
  type: 'between_lines',
  label: 'Between Line',
  toolbox: { category: 'line', pickerLabel: 'Between Lines', pickerGroup: 'lines' },
  filter: { group: 'Lines' },
  icon: { path: mdiCircleMultipleOutline },
  theme: { family: 'betweenLine', category: 'lines', label: 'Between line' },
  lineStyle: { color: greyscale(187), width: 0.1 },
  draw: 'line',
  layers: ['between_lines'],
  panel: { id: 'line_tool', props: { ruleText: 'Digits on the line fall strictly between the digits in the two end circles.' } },
})
