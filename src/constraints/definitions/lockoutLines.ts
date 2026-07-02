import { mdiCardsDiamondOutline } from '@mdi/js'
import { defineConstraint } from '../define'
import { greyscale, colorToCss, type ConstraintShapeStyle } from '../types'

// A line-category one-off like between lines: draws through the shared line
// machinery but renders via its own layer (line + end diamonds) and themes
// through the betweenLine family with its own defaults.

// The lockout diamond shape, folded into the render-ready style below.
const LOCKOUT_DIAMOND: ConstraintShapeStyle = {
  fillColor: greyscale(255),
  outlineColor: { red: 74, green: 144, blue: 217, opacity: 1 },
  textColor: greyscale(0),
  height: 0.80,
  width: 0.80,
}

export const LOCKOUT_LINE_STYLE = {
  lineColor:         colorToCss(greyscale(187)),
  lineStrokeWidth:   2,
  circleRadius:      Math.round(LOCKOUT_DIAMOND.width * 64 / 2), // half-diagonal of the diamond
  circleFill:        colorToCss(LOCKOUT_DIAMOND.fillColor),
  circleStrokeColor: colorToCss(LOCKOUT_DIAMOND.outlineColor),
  circleStrokeWidth: 2,
}

export default defineConstraint({
  type: 'lockout_lines',
  label: 'Lockout Lines',
  toolbox: { category: 'line', pickerGroup: 'lines' },
  filter: { group: 'Lines' },
  icon: { path: mdiCardsDiamondOutline },
  theme: { family: 'betweenLine', category: 'lines', label: 'Lockout line' },
  lineStyle: { color: greyscale(187), width: 0.1 },
  draw: 'line',
  layers: ['lockout_lines'],
  panel: { id: 'line_tool', props: { ruleText: 'The digits in the two diamond endpoints differ by at least 4. Digits on the line between them must fall outside of the range set by the endpoints.' } },
})
