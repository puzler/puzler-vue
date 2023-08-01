import type {
  KillerCage,
  Quadruple,
} from './constraints'
import type {
  Text,
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
  line?: Array<FPuzzleLine>
  quadruple?: Array<Quadruple>
}

type FPuzzleCell = {
  value?: number
  region?: number
  given?: boolean
}

type FPuzzleLine = {
  lines: Array<Array<string>>
  outlineC: string
  width: number
}

export type {
  FPuzzle,
  FPuzzleCell,
}
