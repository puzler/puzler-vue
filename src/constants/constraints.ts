// Mirrors Constraint::VALID_TYPES on the API. Kept in sync by hand; the values
// must match the strings stored in puzzles.constraint_types so the constraint
// filter queries line up. `label` is the human-facing name for the filter UI.
export const CONSTRAINT_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'knights_move', label: "Knight's move" },
  { value: 'kings_move', label: "King's move" },
  { value: 'non_consecutive', label: 'Non-consecutive' },
  { value: 'killer_cage', label: 'Killer cage' },
  { value: 'irregular_region', label: 'Irregular region' },
  { value: 'windoku', label: 'Windoku' },
  { value: 'clone', label: 'Clone' },
  { value: 'thermometer', label: 'Thermometer' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'renban', label: 'Renban' },
  { value: 'german_whispers', label: 'German whispers' },
  { value: 'dutch_whispers', label: 'Dutch whispers' },
  { value: 'palindrome', label: 'Palindrome' },
  { value: 'custom_line', label: 'Custom line' },
]
