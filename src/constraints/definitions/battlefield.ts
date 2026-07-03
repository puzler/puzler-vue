import { mdiSwordCross } from '@mdi/js'
import { defineOuterClueConstraint } from '../define'

export default defineOuterClueConstraint({
  type: 'battlefield',
  label: 'Battlefield',
  themeLabel: 'Battlefield clue',
  iconPath: mdiSwordCross,
  textSize: 0.65,
})
