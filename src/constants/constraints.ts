// The constraint-type tags the backend stores on a puzzle (derived by
// ConstraintTypeExtractor from the definition's activeConstraints,
// globals.variants, and globals.custom). These VALUES must match those editor
// strings exactly so the filter queries line up. Grouped for the filter modal;
// each value's icon comes from CONSTRAINT_ICONS. Globals are grouped by category
// except King's/Knight's move, which solvers filter on individually. Custom
// global value-constraints (anti_diff/ratio/sum) and pure cosmetics are omitted.
export interface ConstraintFilterOption { value: string; label: string }
export interface ConstraintFilterGroup { label: string; options: ReadonlyArray<ConstraintFilterOption> }

export const CONSTRAINT_FILTER_GROUPS: ReadonlyArray<ConstraintFilterGroup> = [
  {
    label: 'Lines',
    options: [
      { value: 'thermometer', label: 'Thermometer' },
      { value: 'slow_thermometer', label: 'Slow Thermometer' },
      { value: 'arrow', label: 'Arrow' },
      { value: 'renban', label: 'Renban' },
      { value: 'german_whispers', label: 'German Whispers' },
      { value: 'dutch_whispers', label: 'Dutch Whispers' },
      { value: 'palindrome', label: 'Palindrome' },
      { value: 'region_sum', label: 'Region Sum' },
      { value: 'between_lines', label: 'Between Line' },
    ],
  },
  {
    label: 'Cells',
    options: [
      { value: 'odd_cells', label: 'Odd' },
      { value: 'even_cells', label: 'Even' },
      { value: 'minimums', label: 'Minimum' },
      { value: 'maximums', label: 'Maximum' },
      { value: 'row_index_cells', label: 'Row Index' },
      { value: 'col_index_cells', label: 'Column Index' },
    ],
  },
  {
    label: 'Connectors',
    options: [
      { value: 'difference_dots', label: 'Difference' },
      { value: 'ratio_dots', label: 'Ratio' },
      { value: 'xv', label: 'XV' },
      { value: 'quadruples', label: 'Quadruple' },
    ],
  },
  {
    label: 'Cages & Regions',
    options: [
      { value: 'killer_cage', label: 'Killer Cage' },
      { value: 'extra_regions', label: 'Extra Region' },
      { value: 'clone', label: 'Clone' },
    ],
  },
  {
    label: 'Outer Clues',
    options: [
      { value: 'x_sums', label: 'X-Sums' },
      { value: 'sandwich_sums', label: 'Sandwich' },
      { value: 'skyscrapers', label: 'Skyscraper' },
      { value: 'little_killers', label: 'Little Killer' },
    ],
  },
  {
    label: 'Global',
    options: [
      { value: 'diagonals', label: 'Diagonal' },
      { value: 'kings_move', label: "King's Move" },
      { value: 'knights_move', label: "Knight's Move" },
      { value: 'anti_kropki', label: 'Anti-Kropki' },
      { value: 'anti_xv', label: 'Anti-XV' },
      { value: 'disjoint_sets', label: 'Disjoint Sets' },
    ],
  },
]

// Flat value→label list, kept for callers that just need to label a selected
// constraint (e.g. the toolbar's active-filter chips).
export const CONSTRAINT_TYPES: ReadonlyArray<ConstraintFilterOption> =
  CONSTRAINT_FILTER_GROUPS.flatMap((group) => group.options)
