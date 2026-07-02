import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'nabner_lines',
  label: 'Nabner Lines',
  themeLabel: 'Nabner line',
  color: { red: 240, green: 195, blue: 0, opacity: 1 },
  ruleText: 'No two digits on the line are consecutive or equal.',
})
