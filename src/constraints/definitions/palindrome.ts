import { defineLineConstraint } from '../define'
import { greyscale } from '../types'

export default defineLineConstraint({
  type: 'palindrome',
  label: 'Palindrome',
  pickerLabel: 'Palindrome Lines',
  color: greyscale(192),
  ruleText: 'Digits read the same from both ends of the line.',
})
