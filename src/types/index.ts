import { Puzzle, Cell } from './puzzle'
import { Controller, ControllerMode } from './controller'
import type { CellNeighbors } from './puzzle'

type ColorPallete = {
  colors: Record<string, string>
  pages: Array<Array<string>>
}

export {
  Puzzle,
  Cell,
  Controller,
  ControllerMode,
}

export type {
  CellNeighbors,
  ColorPallete,
}
