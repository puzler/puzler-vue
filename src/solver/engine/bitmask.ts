// Bitwise candidate utilities. A cell's candidates are stored as a bitmask where
// bit (value - 1) is set when `value` is still possible. Value 1 → bit 0, etc.
// A separate "given" flag bit (1 << size) marks a cell whose single value has
// already been committed and propagated.

export function valueBit(value: number): number {
  return 1 << (value - 1)
}

export function allValuesMask(size: number): number {
  return (1 << size) - 1
}

// Number of set bits (popcount), Brian Kernighan's algorithm.
export function popcount(mask: number): number {
  let count = 0
  let m = mask
  while (m !== 0) {
    m &= m - 1
    count += 1
  }
  return count
}

// Lowest set value in the mask, or 0 if the mask is empty.
export function minValue(mask: number): number {
  if (mask === 0) return 0
  // Count trailing zeros.
  let value = 1
  let m = mask
  while ((m & 1) === 0) {
    m >>= 1
    value += 1
  }
  return value
}

// Highest set value in the mask, or 0 if empty.
export function maxValue(mask: number): number {
  if (mask === 0) return 0
  let value = 0
  let m = mask
  while (m !== 0) {
    m >>= 1
    value += 1
  }
  return value
}

export function hasValue(mask: number, value: number): boolean {
  return (mask & valueBit(value)) !== 0
}

export function isSingle(mask: number): boolean {
  return mask !== 0 && (mask & (mask - 1)) === 0
}

// Expand a mask into the list of values it contains (ascending).
export function valuesList(mask: number): number[] {
  const out: number[] = []
  let m = mask
  let value = 1
  while (m !== 0) {
    if ((m & 1) !== 0) out.push(value)
    m >>= 1
    value += 1
  }
  return out
}

// Mask of all values strictly less than `value`.
export function maskBelow(value: number): number {
  return (1 << (value - 1)) - 1
}

// Mask of all values strictly greater than `value`, bounded to `size`.
export function maskAbove(value: number, size: number): number {
  return allValuesMask(size) & ~((1 << value) - 1)
}

// Mask of values strictly between lo and hi (exclusive of both).
export function maskBetweenExclusive(lo: number, hi: number): number {
  if (hi - lo < 2) return 0
  return maskBelow(hi) & ~maskBelow(lo + 1)
}
