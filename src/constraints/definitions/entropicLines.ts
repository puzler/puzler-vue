import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'entropic_lines',
  jsonKey: 'entropicLines',
  label: 'Entropic Lines',
  themeLabel: 'Entropic line',
  color: { red: 250, green: 150, blue: 120, opacity: 1 },
  ruleText: 'Every run of three successive cells on the line contains one low (1-3), one medium (4-6), and one high (7-9) digit.',
})
