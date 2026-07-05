import { mdiDotsSquare } from '@mdi/js'
import { defineGlobalConstraint } from '../define'

export default defineGlobalConstraint({
  type: 'disjoint_sets',
  label: 'Disjoint Sets',
  // The group's own type doubles as its variant string, so the rule toggle
  // serializes as `disjointSets: { enabled: true }`.
  json: { key: 'disjointSets', selfToggleKey: 'enabled' },
  iconPath: mdiDotsSquare,
})
