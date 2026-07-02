import { mdiCircleOffOutline } from '@mdi/js'
import { defineGlobalConstraint, defineGlobalVariant } from '../define'

const antiKropki = defineGlobalConstraint({
  type: 'anti_kropki',
  label: 'Anti-Kropki',
  iconPath: mdiCircleOffOutline,
})

const nonconsecutive = defineGlobalVariant({
  type: 'nonconsecutive',
  label: 'Nonconsecutive',
  variantOf: 'anti_kropki',
})

const antiBlackKropki = defineGlobalVariant({
  type: 'anti_black_kropki',
  label: 'Anti-black Kropki',
  variantOf: 'anti_kropki',
})

export default [antiKropki, nonconsecutive, antiBlackKropki] as const
