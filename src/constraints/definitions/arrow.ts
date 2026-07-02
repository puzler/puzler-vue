import { mdiArrowDecisionOutline } from '@mdi/js'
import { defineConstraint } from '../define'

// A one-off: line-category tool with its own draw machinery, layer, panel and
// theme family.

export const ARROW_STYLE = {
  color: '#aaaaaa',
  bulbRadius: 27,
  outlineWidth: 2.5,
  lineWidth: 2.5,
  headLength: 11,
  // Perpendicular spread of the chevron wings as a fraction of headLength —
  // kept narrow so several arrows can end in one cell without touching
  headSpread: 0.45,
}

export default defineConstraint({
  type: 'arrow',
  label: 'Arrow',
  toolbox: { category: 'line', pickerLabel: 'Arrows', pickerGroup: 'multi_cell' },
  filter: { group: 'Lines', order: 3 },
  icon: { path: mdiArrowDecisionOutline },
  theme: { family: 'arrow', category: 'lines' },
  draw: 'arrow',
  layers: ['arrows'],
  panel: { id: 'arrow' },
})
