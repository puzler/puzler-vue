import { mdiCircleOffOutline } from '@mdi/js'
import { defineGlobalConstraint, defineGlobalVariant } from '../define'

const antiKropki = defineGlobalConstraint({
  type: 'anti_kropki',
  label: 'Anti-Kropki',
  // The custom anti-difference/anti-ratio values live in this group's panel.
  json: { key: 'antiKropki', customValues: { differences: 'anti_diff', ratios: 'anti_ratio' } },
  iconPath: mdiCircleOffOutline,
})

const nonconsecutive = defineGlobalVariant({
  type: 'nonconsecutive',
  label: 'Nonconsecutive',
  jsonKey: 'white',
  variantOf: 'anti_kropki',
})

const antiBlackKropki = defineGlobalVariant({
  type: 'anti_black_kropki',
  label: 'Anti-black Kropki',
  jsonKey: 'black',
  variantOf: 'anti_kropki',
})

export default [antiKropki, nonconsecutive, antiBlackKropki] as const
