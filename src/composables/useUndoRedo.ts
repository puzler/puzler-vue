import { ref, computed } from 'vue'
import type { CellState } from '@/types/grid'

// A reversible action. Setting-mode tools (constraints, cosmetics, regions, …)
// use closure-based commands: they mutate complex editor state that isn't worth
// serializing and only matters while editing, never while solving.
export interface Command {
  execute: () => void
  undo: () => void
}

// Solver-state edits (digits, pencil marks, colors) are recorded as a diff of
// the affected cells rather than closures, so the whole undo/redo history can be
// serialized and restored to resume a solve after a reload. A `null` snapshot
// means the cell was — or becomes — absent from solverCellStates.
export type CellSnapshot = CellState | null

export interface SolverDiff {
  kind: 'solverDiff'
  before: Record<string, CellSnapshot>
  after: Record<string, CellSnapshot>
}

export type HistoryEntry = Command | SolverDiff

export interface SerializedHistory {
  undo: SolverDiff[]
  redo: SolverDiff[]
}

function isDiff(entry: HistoryEntry): entry is SolverDiff {
  return (entry as SolverDiff).kind === 'solverDiff'
}

// `applySnapshot` writes a cell-snapshot map into the live solver state
// (deleting keys whose snapshot is null). Diff entries replay through it in both
// directions; legacy closure commands run their own execute/undo and ignore it.
export function useUndoRedo(applySnapshot?: (snapshot: Record<string, CellSnapshot>) => void) {
  const undoStack = ref<HistoryEntry[]>([])
  const redoStack = ref<HistoryEntry[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function runForward(entry: HistoryEntry): void {
    if (isDiff(entry)) applySnapshot?.(entry.after)
    else entry.execute()
  }

  function runBackward(entry: HistoryEntry): void {
    if (isDiff(entry)) applySnapshot?.(entry.before)
    else entry.undo()
  }

  function execute(entry: HistoryEntry): void {
    runForward(entry)
    undoStack.value = [...undoStack.value, entry]
    redoStack.value = []
  }

  function undo(): void {
    const stack = undoStack.value
    if (!stack.length) return
    const entry = stack[stack.length - 1]
    runBackward(entry)
    undoStack.value = stack.slice(0, -1)
    redoStack.value = [...redoStack.value, entry]
  }

  function redo(): void {
    const stack = redoStack.value
    if (!stack.length) return
    const entry = stack[stack.length - 1]
    runForward(entry)
    redoStack.value = stack.slice(0, -1)
    undoStack.value = [...undoStack.value, entry]
  }

  function clear(): void {
    undoStack.value = []
    redoStack.value = []
  }

  // Only diff entries survive serialization; closure commands are dropped —
  // they belong to setting mode and are never present while solving.
  function serialize(): SerializedHistory {
    return {
      undo: undoStack.value.filter(isDiff),
      redo: redoStack.value.filter(isDiff),
    }
  }

  function hydrate(history: SerializedHistory | null | undefined): void {
    undoStack.value = history?.undo ? [...history.undo] : []
    redoStack.value = history?.redo ? [...history.redo] : []
  }

  return { canUndo, canRedo, execute, undo, redo, clear, serialize, hydrate }
}
