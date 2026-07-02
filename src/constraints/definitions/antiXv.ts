import { mdiCloseOutline } from '@mdi/js'
import { defineGlobalConstraint, defineGlobalVariant } from '../define'

const antiXv = defineGlobalConstraint({
  type: 'anti_xv',
  label: 'Anti-XV',
  iconPath: mdiCloseOutline,
})

const antiX = defineGlobalVariant({
  type: 'anti_x',
  label: 'Anti-X',
  variantOf: 'anti_xv',
})

const antiV = defineGlobalVariant({
  type: 'anti_v',
  label: 'Anti-V',
  variantOf: 'anti_xv',
})

export default [antiXv, antiX, antiV] as const
