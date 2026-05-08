import { ref, computed } from 'vue'

export interface Command {
  execute: () => void
  undo: () => void
}

export function useUndoRedo() {
  const undoStack = ref<Command[]>([])
  const redoStack = ref<Command[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function execute(command: Command): void {
    command.execute()
    undoStack.value = [...undoStack.value, command]
    redoStack.value = []
  }

  function undo(): void {
    const stack = undoStack.value
    if (!stack.length) return
    const command = stack[stack.length - 1]
    command.undo()
    undoStack.value = stack.slice(0, -1)
    redoStack.value = [...redoStack.value, command]
  }

  function redo(): void {
    const stack = redoStack.value
    if (!stack.length) return
    const command = stack[stack.length - 1]
    command.execute()
    redoStack.value = stack.slice(0, -1)
    undoStack.value = [...undoStack.value, command]
  }

  function clear(): void {
    undoStack.value = []
    redoStack.value = []
  }

  return { canUndo, canRedo, execute, undo, redo, clear }
}
