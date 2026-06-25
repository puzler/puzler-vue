// Persistence of an in-progress solving session so an accidental reload — or a
// later return — restores everything: cell entries, pencil marks, player colors,
// the timer, selection/input-mode, and the full undo/redo history.
//
// Two backends (orchestrated by stores/solveSession.ts):
//   - Logged-in users -> the server (PuzzlePlay), authoritative + cross-device.
//   - Guests          -> localStorage only, with LRU eviction so a long history
//                        of played puzzles never blows the ~5MB quota.
// localStorage is also written for logged-in users as an instant-restore /
// crash-safety cache; whichever snapshot is newer (by savedAt) wins on load.
//
// This module is framework-free and defensive (tolerant of shape drift / garbage),
// mirroring utils/playerSettings.ts and utils/colorPalette.ts.

import { compressToUTF16, decompressFromUTF16 } from 'lz-string'
import type { CellState, SolverInputMode } from '@/types/grid'
import type { SerializedHistory, SolverDiff } from '@/composables/useUndoRedo'

export const SOLVE_SCHEMA_VERSION = 1

// Cap the persisted undo/redo depth so a single session's blob stays small (the
// in-memory stacks can be longer; only the tail is serialized).
const MAX_HISTORY = 200

// localStorage LRU bounds (guests, plus the logged-in crash-safety cache).
const SNAP_PREFIX = 'puzler:solve:'
const INDEX_KEY = 'puzler:solve:index'
const MAX_ENTRIES = 15
const MAX_BYTES = 2_500_000

const VALID_INPUT_MODES: SolverInputMode[] = ['digit', 'center', 'corner', 'color']

// Timer holds that should survive a reload. Transient UI holds (e.g. 'rules',
// set while the rules modal is open) are dropped — the UI re-applies them.
const PERSISTENT_HOLDS = new Set(['manual'])

export interface SolveProgress {
  schemaVersion: number
  savedAt: number
  solutionHash: string | null
  history: SerializedHistory
  elapsed: number
  holds: string[]
  selection: string[]
  inputMode: SolverInputMode
  palettePage: number
}

export interface SolveSnapshot {
  cellState: Record<string, CellState>
  progress: SolveProgress
}

// Structural views of the stores/timer this layer reads and writes, so the util
// stays decoupled and unit-testable (real stores + a fake timer both satisfy them).
export interface SolverEditorLike {
  solverCellStates: Record<string, CellState>
  givenDigits: Record<string, number>
  selection: Set<string>
  inputMode: SolverInputMode
  setInputMode: (m: SolverInputMode) => void
  serializeHistory: () => SerializedHistory
  hydrateHistory: (h: SerializedHistory | null) => void
}
export interface SolverTimerLike {
  elapsed: { value: number }
  holds: { value: Set<string> }
  restore: (elapsed: number, holds: string[]) => void
}
export interface SolverPaletteLike {
  pageIndex: number
  setPageIndex: (i: number) => void
}

// ── Snapshot build / apply ───────────────────────────────────────────────────

function cloneCellStates(states: Record<string, CellState>): Record<string, CellState> {
  const out: Record<string, CellState> = {}
  for (const k of Object.keys(states)) {
    const c = states[k]
    out[k] = {
      value: c.value,
      cornerMarks: [...c.cornerMarks],
      centerMarks: [...c.centerMarks],
      color: c.color,
      colors: [...c.colors],
    }
  }
  return out
}

function capHistory(history: SerializedHistory): SerializedHistory {
  return { undo: history.undo.slice(-MAX_HISTORY), redo: history.redo.slice(-MAX_HISTORY) }
}

function persistableHolds(holds: Set<string>): string[] {
  return [...holds].filter((h) => PERSISTENT_HOLDS.has(h))
}

export function serializeSession(
  editor: SolverEditorLike,
  timer: SolverTimerLike,
  palette: SolverPaletteLike,
  solutionHash: string | null,
): SolveSnapshot {
  return {
    cellState: cloneCellStates(editor.solverCellStates),
    progress: {
      schemaVersion: SOLVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      solutionHash,
      history: capHistory(editor.serializeHistory()),
      elapsed: timer.elapsed.value,
      holds: persistableHolds(timer.holds.value),
      selection: [...editor.selection],
      inputMode: editor.inputMode,
      palettePage: palette.pageIndex,
    },
  }
}

// Restore a snapshot onto the live stores. MUST run after deserializePuzzle +
// editor.reset() (which clear solver state and history). Skips any cell that is
// now a given (defensive — shouldn't happen while the solutionHash matches).
export function applySession(
  editor: SolverEditorLike,
  timer: SolverTimerLike,
  palette: SolverPaletteLike,
  snap: SolveSnapshot,
): void {
  const cells: Record<string, CellState> = {}
  for (const k of Object.keys(snap.cellState)) {
    if (editor.givenDigits[k] === undefined) cells[k] = snap.cellState[k]
  }
  editor.solverCellStates = cells
  editor.selection = new Set(snap.progress.selection)
  editor.setInputMode(snap.progress.inputMode)
  editor.hydrateHistory(snap.progress.history)
  palette.setPageIndex(snap.progress.palettePage)
  timer.restore(snap.progress.elapsed, snap.progress.holds)
}

export function isEmptySnapshot(snap: SolveSnapshot): boolean {
  return (
    Object.keys(snap.cellState).length === 0 &&
    snap.progress.elapsed === 0 &&
    snap.progress.history.undo.length === 0
  )
}

// ── Live updates: per-device, per-puzzle opt-out ─────────────────────────────
// A user may not want one device mirroring another mid-solve. Stored per device
// (localStorage) keyed by puzzle; default on (absent key === enabled).
const LIVE_PREFIX = 'puzler:solve-live:'

export function isLiveUpdatesEnabled(puzzleId: string): boolean {
  try {
    return localStorage.getItem(LIVE_PREFIX + puzzleId) !== '0'
  } catch {
    return true
  }
}

export function setLiveUpdatesEnabledFor(puzzleId: string, enabled: boolean): void {
  try {
    if (enabled) localStorage.removeItem(LIVE_PREFIX + puzzleId)
    else localStorage.setItem(LIVE_PREFIX + puzzleId, '0')
  } catch {
    /* ignore (unavailable storage) */
  }
}

// ── Cell-level merge of an incoming remote update ────────────────────────────
function arraysEqual(a: readonly (number | string)[], b: readonly (number | string)[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function cellsEqual(a: CellState | undefined, b: CellState | undefined): boolean {
  if (!a || !b) return a === b
  return (
    a.value === b.value &&
    a.color === b.color &&
    arraysEqual(a.cornerMarks, b.cornerMarks) &&
    arraysEqual(a.centerMarks, b.centerMarks) &&
    arraysEqual(a.colors, b.colors)
  )
}

// True when the local board diverges from the last-known server baseline — i.e.
// the user has unsynced edits worth pushing. Gates the live server push so an
// applied remote update doesn't echo back into an endless save loop.
export function hasLocalChanges(
  current: Record<string, CellState>,
  baseline: Record<string, CellState>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)])
  for (const k of keys) if (!cellsEqual(current[k], baseline[k])) return true
  return false
}

// Merge an incoming server cell map into the local board, preserving cells the
// local user has edited since the last sync (those that diverge from `baseline`).
// Adopts every other incoming change and drops local cells the server no longer
// has (unless locally dirty). Same-cell conflicts keep the local edit until the
// local save pushes it (then last-write-wins server-side).
export function mergeRemoteCells(
  current: Record<string, CellState>,
  baseline: Record<string, CellState>,
  incoming: Record<string, CellState>,
): Record<string, CellState> {
  const dirty = (k: string) => !cellsEqual(current[k], baseline[k])
  const next: Record<string, CellState> = {}
  for (const k of Object.keys(current)) if (dirty(k)) next[k] = current[k]
  for (const k of Object.keys(incoming)) if (!dirty(k)) next[k] = incoming[k]
  return next
}

// ── Normalization (tolerant of garbage / shape drift) ────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function numberArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : []
}
function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []
}

function normalizeCell(raw: unknown): CellState {
  const r = isObject(raw) ? raw : {}
  return {
    value: typeof r.value === 'number' ? r.value : null,
    cornerMarks: numberArray(r.cornerMarks),
    centerMarks: numberArray(r.centerMarks),
    color: typeof r.color === 'string' ? r.color : null,
    colors: stringArray(r.colors),
  }
}

function normalizeCellState(raw: unknown): Record<string, CellState> {
  const out: Record<string, CellState> = {}
  if (isObject(raw)) for (const k of Object.keys(raw)) out[k] = normalizeCell(raw[k])
  return out
}

function normalizeDiffArray(v: unknown): SolverDiff[] {
  if (!Array.isArray(v)) return []
  return v.filter((e): e is SolverDiff => isObject(e) && (e as { kind?: unknown }).kind === 'solverDiff')
}

function normalizeHistory(raw: unknown): SerializedHistory {
  const r = isObject(raw) ? raw : {}
  return { undo: normalizeDiffArray(r.undo), redo: normalizeDiffArray(r.redo) }
}

export function normalizeProgress(raw: unknown): SolveProgress {
  const r = isObject(raw) ? raw : {}
  const rawMode = r.inputMode
  const inputMode: SolverInputMode =
    typeof rawMode === 'string' && (VALID_INPUT_MODES as string[]).includes(rawMode)
      ? (rawMode as SolverInputMode)
      : 'digit'
  return {
    schemaVersion: typeof r.schemaVersion === 'number' ? r.schemaVersion : SOLVE_SCHEMA_VERSION,
    savedAt: typeof r.savedAt === 'number' ? r.savedAt : 0,
    solutionHash: typeof r.solutionHash === 'string' ? r.solutionHash : null,
    history: normalizeHistory(r.history),
    elapsed: typeof r.elapsed === 'number' && r.elapsed >= 0 ? Math.floor(r.elapsed) : 0,
    holds: stringArray(r.holds),
    selection: stringArray(r.selection),
    inputMode,
    palettePage: typeof r.palettePage === 'number' && r.palettePage >= 0 ? Math.floor(r.palettePage) : 0,
  }
}

// Returns null for malformed / wrong-version data so callers fall back to a
// clean slate.
export function normalizeSnapshot(raw: unknown): SolveSnapshot | null {
  if (!isObject(raw)) return null
  const progress = normalizeProgress(raw.progress)
  if (progress.schemaVersion !== SOLVE_SCHEMA_VERSION) return null
  return { cellState: normalizeCellState(raw.cellState), progress }
}

// Build a snapshot from a server PuzzlePlay (its cell_state + progress_state columns).
export function snapshotFromServer(cellState: unknown, progressState: unknown): SolveSnapshot {
  return { cellState: normalizeCellState(cellState), progress: normalizeProgress(progressState) }
}

// ── localStorage with LRU eviction ───────────────────────────────────────────

interface IndexEntry { id: string; savedAt: number; bytes: number }

function readIndex(): IndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e): e is IndexEntry =>
      isObject(e) && typeof e.id === 'string' && typeof e.savedAt === 'number' && typeof e.bytes === 'number')
  } catch {
    return []
  }
}

function writeIndex(idx: IndexEntry[]): void {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(idx)) } catch { /* ignore (unavailable storage) */ }
}

function trySet(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

function removeSnapshotKey(id: string): void {
  try { localStorage.removeItem(SNAP_PREFIX + id) } catch { /* ignore */ }
}

export function readLocalSnapshot(puzzleId: string): SolveSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAP_PREFIX + puzzleId)
    if (!raw) return null
    const json = decompressFromUTF16(raw)
    if (!json) return null
    return normalizeSnapshot(JSON.parse(json))
  } catch {
    return null
  }
}

export function removeLocalSnapshot(puzzleId: string): void {
  removeSnapshotKey(puzzleId)
  writeIndex(readIndex().filter((e) => e.id !== puzzleId))
}

// Write a snapshot, evicting the least-recently-saved puzzles to stay within the
// entry/byte caps, and falling back to eviction-and-retry on QuotaExceededError.
export function writeLocalSnapshot(puzzleId: string, snap: SolveSnapshot): void {
  let payload: string
  try { payload = compressToUTF16(JSON.stringify(snap)) } catch { return }

  const bytes = payload.length * 2 // localStorage stores UTF-16 (~2 bytes/char)
  const idx = readIndex().filter((e) => e.id !== puzzleId)
  idx.push({ id: puzzleId, savedAt: snap.progress.savedAt || Date.now(), bytes })
  idx.sort((a, b) => a.savedAt - b.savedAt) // oldest first; the entry we're writing sorts last

  // Evict by entry count, then by total bytes (never the entry we're writing).
  while (idx.length > MAX_ENTRIES) { const e = idx.shift(); if (e) removeSnapshotKey(e.id) }
  let total = idx.reduce((sum, e) => sum + e.bytes, 0)
  while (total > MAX_BYTES && idx.length > 1) {
    const e = idx.shift()
    if (e) { total -= e.bytes; removeSnapshotKey(e.id) }
  }

  let stored = trySet(SNAP_PREFIX + puzzleId, payload)
  // Quota hit despite budgeting: drop the oldest other entries one at a time.
  while (!stored && idx.length > 1 && idx[0].id !== puzzleId) {
    const e = idx.shift()
    if (e) removeSnapshotKey(e.id)
    stored = trySet(SNAP_PREFIX + puzzleId, payload)
  }

  if (!stored) {
    // Couldn't persist (e.g. private mode) — keep the index honest.
    writeIndex(idx.filter((e) => e.id !== puzzleId))
    return
  }
  writeIndex(idx)
}
