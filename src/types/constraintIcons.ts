import { CONSTRAINT_LINE_STYLES } from '@/types/constraints'
import {
  mdiThermometer,
  mdiArrowDecisionOutline,
  mdiChartLineVariant,
  mdiCircleMultipleOutline,
  mdiCircle,
  mdiSquare,
  mdiUnfoldLessVertical,
  mdiUnfoldMoreVertical,
  mdiMapMarker,
  mdiMapMarkerOutline,
  mdiGamepadCircleOutline,
  mdiGamepadCircle,
  mdiAlphaVCircle,
  mdiDotsSquare,
  mdiCheckboxMultipleBlank,
  mdiTextureBox,
  mdiNumeric9Plus,
  mdiBreadSlice,
  mdiDomain,
  mdiArrowBottomRightThick,
  mdiSquareOffOutline,
  mdiChessKing,
  mdiCircleOffOutline,
  mdiCloseOutline,
  mdiPalette,
  mdiAlphabeticalVariant,
  mdiShape,
} from '@mdi/js'

export interface ConstraintIcon {
  path: string
  color?: string
  rotate?: number
}

export const CONSTRAINT_ICONS: Record<string, ConstraintIcon> = {
  // Lines — colors pulled from CONSTRAINT_LINE_STYLES as single source of truth
  renban:          { path: mdiChartLineVariant, color: CONSTRAINT_LINE_STYLES.renban.color },
  german_whispers: { path: mdiChartLineVariant, color: CONSTRAINT_LINE_STYLES.german_whispers.color },
  region_sum:      { path: mdiChartLineVariant, color: CONSTRAINT_LINE_STYLES.region_sum.color },
  palindrome:      { path: mdiChartLineVariant, color: CONSTRAINT_LINE_STYLES.palindrome.color },
  dutch_whispers:  { path: mdiChartLineVariant, color: CONSTRAINT_LINE_STYLES.dutch_whispers.color },
  between_lines:   { path: mdiCircleMultipleOutline },

  // Single Cell
  odd_cells:       { path: mdiCircle, color: 'rgb(187, 187, 187)' },
  even_cells:      { path: mdiSquare, color: 'rgb(187, 187, 187)' },
  minimums:        { path: mdiUnfoldLessVertical },
  maximums:        { path: mdiUnfoldMoreVertical },
  row_index_cells: { path: mdiMapMarker },
  col_index_cells: { path: mdiMapMarkerOutline },

  // Cell Connectors
  difference_dots: { path: mdiGamepadCircleOutline },
  ratio_dots:      { path: mdiGamepadCircle },
  xv:              { path: mdiAlphaVCircle },
  quadruples:      { path: mdiGamepadCircleOutline, rotate: 45 },

  // Multi-Cell
  thermometer:     { path: mdiThermometer },
  arrow:           { path: mdiArrowDecisionOutline },
  killer_cage:     { path: mdiDotsSquare },
  clone:           { path: mdiCheckboxMultipleBlank },
  extra_regions:   { path: mdiTextureBox },

  // Outer Clues
  x_sums:          { path: mdiNumeric9Plus },
  sandwich_sums:   { path: mdiBreadSlice },
  skyscrapers:     { path: mdiDomain },
  little_killers:  { path: mdiArrowBottomRightThick },

  // Global Constraints
  diagonals:       { path: mdiSquareOffOutline },
  chess:           { path: mdiChessKing },
  anti_kropki:     { path: mdiCircleOffOutline },
  anti_xv:         { path: mdiCloseOutline },
  disjoint_sets:   { path: mdiDotsSquare },

  // Cosmetics
  cosmetic_line:   { path: mdiChartLineVariant },
  cell_color:      { path: mdiPalette },
  shape:           { path: mdiShape },
  text:            { path: mdiAlphabeticalVariant },
  cosmetic_cage:   { path: mdiDotsSquare },
}
