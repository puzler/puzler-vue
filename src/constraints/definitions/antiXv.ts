import { mdiCloseOutline } from '@mdi/js'
import { defineGlobalConstraint, defineGlobalVariant } from '../define'

const antiXv = defineGlobalConstraint({
  type: 'anti_xv',
  label: 'Anti-XV',
  // The custom anti-sum values live in this group's panel.
  json: { key: 'antiXv', customValues: { sums: 'anti_sum' } },
  iconPath: mdiCloseOutline,
})

const antiX = defineGlobalVariant({
  type: 'anti_x',
  label: 'Anti-X',
  jsonKey: 'x',
  variantOf: 'anti_xv',
})

const antiV = defineGlobalVariant({
  type: 'anti_v',
  label: 'Anti-V',
  jsonKey: 'v',
  variantOf: 'anti_xv',
})

export default [antiXv, antiX, antiV] as const
