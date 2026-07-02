import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'renban',
  label: 'Renban',
  pickerLabel: 'Renban Lines',
  color: { red: 240, green: 103, blue: 240, opacity: 1 },
  ruleText: 'The cells must contain a set of consecutive digits in any order.',
})
