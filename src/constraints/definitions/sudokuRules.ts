import { mdiGrid } from '@mdi/js'
import { defineGlobalConstraint } from '../define'

// Standard sudoku rules: rows, columns and regions must not repeat digits.
// The chip carries the rule: the document key's PRESENCE means the puzzle has
// sudoku rules (new puzzles seed it; the migrator and the
// puzzle_format:add_sudoku_rules backfill stamp it onto every pre-change
// puzzle), an absent key means a rules-off puzzle, and `enabled: false`
// soft-disables without dropping the chip. The checkbox state lives in
// editor.sudokuRulesEnabled, NOT in activeGlobalVariants (whose members all
// mean "absent = off"); the effective rule is editor.sudokuRulesActive.
// filter: false — nearly every puzzle carries the chip, so an archive filter
// keyed on it would be noise.
export default defineGlobalConstraint({
  type: 'sudoku_rules',
  label: 'Sudoku Rules',
  json: { key: 'sudokuRules', selfToggleKey: 'enabled' },
  iconPath: mdiGrid,
  filter: false,
  panelId: 'sudoku_rules',
})
