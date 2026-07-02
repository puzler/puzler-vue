import { mdiSquareOffOutline } from '@mdi/js'
import { defineGlobalConstraint, defineGlobalVariant } from '../define'

// The diagonals category plus its four variants. Variants are themeable
// pseudo-constraints: styled individually, but placed via the category def.

const DIAGONAL_BLUE = { color: '#93c5fd', strokeWidth: 2, opacity: 0.85 }
const DIAGONAL_RED = { color: '#f87171', strokeWidth: 2, opacity: 0.85 }

const diagonals = defineGlobalConstraint({
  type: 'diagonals',
  label: 'Diagonals',
  iconPath: mdiSquareOffOutline,
  filter: { label: 'Diagonal' },
  layers: ['diagonals'],
})

const positiveDiagonal = defineGlobalVariant({
  type: 'positive_diagonal',
  label: 'Positive diagonal',
  variantOf: 'diagonals',
  excludes: 'anti_positive_diagonal',
  theme: { family: 'diagonal', category: 'global' },
  diagonalStyle: DIAGONAL_BLUE,
})

const negativeDiagonal = defineGlobalVariant({
  type: 'negative_diagonal',
  label: 'Negative diagonal',
  variantOf: 'diagonals',
  excludes: 'anti_negative_diagonal',
  theme: { family: 'diagonal', category: 'global' },
  diagonalStyle: DIAGONAL_BLUE,
})

const antiPositiveDiagonal = defineGlobalVariant({
  type: 'anti_positive_diagonal',
  label: 'Anti-positive diagonal',
  variantOf: 'diagonals',
  excludes: 'positive_diagonal',
  theme: { family: 'diagonal', category: 'global' },
  diagonalStyle: DIAGONAL_RED,
})

const antiNegativeDiagonal = defineGlobalVariant({
  type: 'anti_negative_diagonal',
  label: 'Anti-negative diagonal',
  variantOf: 'diagonals',
  excludes: 'negative_diagonal',
  theme: { family: 'diagonal', category: 'global' },
  diagonalStyle: DIAGONAL_RED,
})

export default [
  diagonals,
  positiveDiagonal,
  negativeDiagonal,
  antiPositiveDiagonal,
  antiNegativeDiagonal,
] as const
