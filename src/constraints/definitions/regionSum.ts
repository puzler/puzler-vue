import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'region_sum',
  label: 'Region Sum',
  pickerLabel: 'Region Sum Lines',
  themeLabel: 'Region sum line',
  color: { red: 0, green: 200, blue: 255, opacity: 1 },
  ruleText: 'The line sums to the same total in each box it passes through.',
})
