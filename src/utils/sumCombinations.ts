// Distinct-digit sum combination enumeration for the solver's math helpers
// (sum combination helper + killer cage helper). Pure and framework-free.
//
// A "combo" is a set of distinct digits from 1..digitMax, kept sorted
// ascending. Enumeration is a DFS over the digit pool in ascending order, so
// combos emerge already sorted lexicographically (which for fixed size is also
// ascending by total contribution order the helpers want).

export interface ComboFilter {
  size?: number | null
  minSize?: number | null
  maxSize?: number | null
  total?: number | null
  minTotal?: number | null
  maxTotal?: number | null
  include?: readonly number[]
  exclude?: readonly number[]
}

export interface Combo {
  digits: number[]
  total: number
  key: string
}

export interface EnumerateResult {
  combos: Combo[]
  truncated: boolean
}

export interface ComboStats {
  count: number
  required: number[]
  missing: number[]
}

export function comboKey(digits: readonly number[]): string {
  return digits.join(',')
}

function hasValue(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

// Enumerate every distinct-digit combo within the filter's bounds. `digitMax`
// is the top of the digit range (digits run 1..digitMax). Output is capped at
// `cap` rows (the helpers render every row; an unconstrained 16-digit range
// would otherwise produce 65k of them).
export function enumerateCombos(digitMax: number, filter: ComboFilter, cap = 2000): EnumerateResult {
  if (digitMax < 1 || digitMax > 16) return { combos: [], truncated: false }

  const include = [...new Set(filter.include ?? [])]
    .filter((d) => d >= 1 && d <= digitMax)
    .sort((a, b) => a - b)
  const excluded = new Set(filter.exclude ?? [])
  // An included digit that is also excluded can never be satisfied.
  if (include.some((d) => excluded.has(d))) return { combos: [], truncated: false }

  const pool: number[] = []
  for (let d = 1; d <= digitMax; d++) if (!excluded.has(d)) pool.push(d)

  const poolTotal = pool.reduce((a, b) => a + b, 0)
  const sizeLo = hasValue(filter.size)
    ? filter.size
    : Math.max(hasValue(filter.minSize) ? filter.minSize : 1, include.length, 1)
  const sizeHi = hasValue(filter.size) ? filter.size : hasValue(filter.maxSize) ? filter.maxSize : pool.length
  const totalLo = hasValue(filter.total) ? filter.total : hasValue(filter.minTotal) ? filter.minTotal : 0
  const totalHi = hasValue(filter.total) ? filter.total : hasValue(filter.maxTotal) ? filter.maxTotal : poolTotal

  if (sizeLo > sizeHi || totalLo > totalHi || sizeLo > pool.length) return { combos: [], truncated: false }

  // suffixSmallest[i][k] = sum of the k smallest digits in pool[i..]; likewise
  // suffixLargest for the k largest. Used to prune unreachable totals.
  const n = pool.length
  const suffixSmallest: number[][] = []
  const suffixLargest: number[][] = []
  for (let i = 0; i <= n; i++) {
    const rest = pool.slice(i)
    const small = [0]
    const large = [0]
    for (let k = 1; k <= rest.length; k++) {
      small.push(small[k - 1] + rest[k - 1])
      large.push(large[k - 1] + rest[rest.length - k])
    }
    suffixSmallest.push(small)
    suffixLargest.push(large)
  }

  const includeSet = new Set(include)
  const combos: Combo[] = []
  let truncated = false
  const chosen: number[] = []

  const dfs = (start: number, sum: number, includeLeft: number): void => {
    if (truncated) return
    const len = chosen.length
    if (len >= sizeLo && sum >= totalLo && sum <= totalHi && includeLeft === 0) {
      if (combos.length >= cap) {
        truncated = true
        return
      }
      combos.push({ digits: [...chosen], total: sum, key: comboKey(chosen) })
    }
    if (len === sizeHi) return
    for (let i = start; i < n; i++) {
      const d = pool[i]
      if (sum + d > totalHi) break // pool is ascending; nothing later fits either
      // Required digits are ascending too: once we're past one without taking
      // it, no deeper branch can contain it.
      if (includeLeft > 0 && include[include.length - includeLeft] < d) break
      const remaining = n - i - 1
      const needMore = Math.max(sizeLo - len - 1, 0)
      if (remaining < needMore) break
      if (sum + d + suffixLargest[i + 1][Math.min(remaining, sizeHi - len - 1)] < totalLo) continue
      chosen.push(d)
      dfs(i + 1, sum + d, includeLeft - (includeSet.has(d) ? 1 : 0))
      chosen.pop()
      if (truncated) return
    }
  }

  dfs(0, 0, include.length)
  return { combos, truncated }
}

// Stats over the combos that survive both auto-filtering and manual strikes:
// `required` digits appear in every active combo, `missing` in none.
export function comboStats(combos: readonly Combo[], struck: ReadonlySet<string>, digitMax: number): ComboStats {
  const active = combos.filter((c) => !struck.has(c.key))
  const seen = new Set<number>()
  let requiredMask: Set<number> | null = null
  for (const combo of active) {
    const digits = new Set(combo.digits)
    for (const d of digits) seen.add(d)
    if (requiredMask === null) {
      requiredMask = digits
    } else {
      for (const d of requiredMask) if (!digits.has(d)) requiredMask.delete(d)
    }
  }
  const required = requiredMask ? [...requiredMask].sort((a, b) => a - b) : []
  const missing: number[] = []
  for (let d = 1; d <= digitMax; d++) if (!seen.has(d)) missing.push(d)
  return { count: active.length, required, missing }
}
