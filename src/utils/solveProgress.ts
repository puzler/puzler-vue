// Lightweight client-side record of which puzzles the visitor has solved, used
// to gate in-sequence collections without requiring an account. Best-effort
// (localStorage), not authoritative — it's a solving aid, not access control.
const KEY = 'puzler_solved'

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function solvedIds(): Set<string> {
  return read()
}

export function isSolved(id: string): boolean {
  return read().has(id)
}

export function markSolved(id: string): void {
  const set = read()
  set.add(id)
  localStorage.setItem(KEY, JSON.stringify([...set]))
}
