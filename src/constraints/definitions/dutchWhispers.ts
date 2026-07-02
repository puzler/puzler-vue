import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'dutch_whispers',
  label: 'Dutch Whispers',
  themeLabel: 'Dutch whispers',
  color: { red: 255, green: 111, blue: 0, opacity: 1 },
  ruleText: 'Adjacent digits on the line must differ by at least 4.',
})
