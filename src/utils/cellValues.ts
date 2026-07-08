// Helpers for mixed digit/letter cell values (the Letter tool stores capital
// letters in the same value/mark fields as digits). Mark arrays MUST sort
// through compareCellValues — a bare `(a, b) => a - b` on a mixed array is a
// NaN comparator and scrambles the order.

import type { CellValue } from '@/types/grid'

// A single capital letter, the only non-numeric cell value we store.
export function isLetter(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Z]$/.test(v)
}

// Digits first (ascending), then letters (alphabetical).
export function compareCellValues(a: CellValue, b: CellValue): number {
  const aNum = typeof a === 'number'
  const bNum = typeof b === 'number'
  if (aNum && bNum) return (a as number) - (b as number)
  if (aNum) return -1
  if (bNum) return 1
  return String(a).localeCompare(String(b))
}

export function sortMarks(marks: CellValue[]): CellValue[] {
  return [...marks].sort(compareCellValues)
}

// Numpad key -> letter in letter mode: keys 1-9 are A-I, the 0 key is J (the
// first ten letters, in keypad reading order).
export const LETTER_LABELS: Record<number, string> = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I', 0: 'J',
}
