import { mdiChessKing, mdiChessKnight } from '@mdi/js'
import { defineGlobalConstraint, defineGlobalVariant } from '../define'

// The chess category is not archive-filterable itself: King's/Knight's move are
// filtered individually on the listing pages, so each variant carries its own
// icon + filter chip.

const chess = defineGlobalConstraint({
  type: 'chess',
  label: 'Chess',
  iconPath: mdiChessKing,
  filter: false,
})

const kingsMove = defineGlobalVariant({
  type: 'kings_move',
  label: "King's move",
  variantOf: 'chess',
  filterLabel: "King's Move",
  icon: { path: mdiChessKing },
})

const knightsMove = defineGlobalVariant({
  type: 'knights_move',
  label: "Knight's move",
  variantOf: 'chess',
  filterLabel: "Knight's Move",
  icon: { path: mdiChessKnight },
})

export default [chess, kingsMove, knightsMove] as const
