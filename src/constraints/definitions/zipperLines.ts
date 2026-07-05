import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'zipper_lines',
  jsonKey: 'zipperLines',
  label: 'Zipper Lines',
  themeLabel: 'Zipper line',
  color: { red: 172, green: 138, blue: 255, opacity: 1 },
  ruleText: 'Digits an equal distance from the center of the line sum to the digit in the central cell. The line must have an odd number of cells.',
})
