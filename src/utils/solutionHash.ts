import { sha256 } from 'js-sha256'

// Canonical serialization: sorted cell keys joined as "r0c0:5,r0c1:3,..."
// MUST match SolutionHasher#hash in api/app/services/solution_hasher.rb exactly.
// Letter values interpolate like any other value — they simply never produce
// the hash of a numeric solution.
export function hashSolution(grid: Record<string, number | string>): string {
  const canonical = Object.entries(grid)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join(',')

  return sha256(canonical)
}
