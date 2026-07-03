import { mdiDoor } from '@mdi/js'
import { defineOuterClueConstraint } from '../define'

export default defineOuterClueConstraint({
  type: 'numbered_rooms',
  label: 'Numbered Rooms',
  themeLabel: 'Numbered room',
  iconPath: mdiDoor,
  textSize: 0.65,
})
