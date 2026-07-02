import { mdiDotsSquare } from '@mdi/js'
import { defineGlobalConstraint } from '../define'

export default defineGlobalConstraint({
  type: 'disjoint_sets',
  label: 'Disjoint Sets',
  iconPath: mdiDotsSquare,
})
