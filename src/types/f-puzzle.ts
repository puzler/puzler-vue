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
  palindrome?: Array<FPuzzlePalindrome>
  circle?: Array<FPuzzleCircle>
  rectangle?: Array<FPuzzleRectangle>
}

type FPuzzleCell = {
  value?: number
  region?: number
  given?: boolean
}

type FPuzzleCircle = {
  cells: Array<string>
  baseC: string
  fontC: string
  outlineC: string
  height: number
  width: number
}

type FPuzzleRectangle = {
  cells: Array<string>
  baseC: string
  fontC: string
  outlineC: string
  width: number
  height: number
  angle?: number
}

type FPuzzlePalindrome = {
  lines: Array<Array<string>>
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
