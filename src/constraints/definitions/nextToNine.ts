import { mdiNumeric9CircleOutline } from '@mdi/js'
import { defineOuterClueConstraint } from '../define'

export default defineOuterClueConstraint({
  type: 'next_to_nine',
  label: 'Next to Nine',
  themeLabel: 'Next-to-nine clue',
  iconPath: mdiNumeric9CircleOutline,
  // Smaller than the numeric outer clues: two-digit values sit side by side in
  // the ring, so they need breathing room between neighbours.
  textSize: 0.5,
})
