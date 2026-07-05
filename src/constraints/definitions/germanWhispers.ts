import { defineLineConstraint } from '../define'

export default defineLineConstraint({
  type: 'german_whispers',
  jsonKey: 'germanWhispers',
  label: 'German Whispers',
  themeLabel: 'German whispers',
  color: { red: 103, green: 240, blue: 103, opacity: 1 },
  ruleText: 'Adjacent digits on the line must differ by at least 5.',
})
