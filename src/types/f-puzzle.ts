import type {
  KillerCage,
} from './constraints'

type FPuzzle = {
  size: number
  grid: Array<Array<FPuzzleCell>>
  title?: string
  author?: string
  ruleset?: string
  solution?: Array<number|null>
  cage: Array<KillerCage>
  killercage: Array<KillerCage>
  extraregion: Array<KillerCage>
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
