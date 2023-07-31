import type {
  KillerCage,
} from './constraints'
import type {
  Text
} from './cosmetics'

type FPuzzle = {
  size: number
  grid: Array<Array<FPuzzleCell>>
  title?: string
  author?: string
  ruleset?: string
  solution?: Array<number|null>
  cage?: Array<KillerCage>
  killercage?: Array<KillerCage>
  extraregion?: Array<KillerCage>
  text?: Array<Text>
}

type FPuzzleCell = {
  value?: number
  region?: number
  given?: boolean
}

export type {
  FPuzzle,
  FPuzzleCell,
}
