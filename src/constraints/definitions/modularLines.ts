import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'modular_lines',
  label: 'Modular Lines',
  themeLabel: 'Modular line',
  color: { red: 0, green: 181, blue: 173, opacity: 1 },
  ruleText: 'Every run of three successive cells on the line contains one digit from each of 147, 258, and 369.',
})
