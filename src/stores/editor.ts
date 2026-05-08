import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUndoRedo } from '@/composables/useUndoRedo'

export interface ActiveConstraint {
  id: string
  type: string
  label: string
  category: string
}

export const useEditorStore = defineStore('editor', () => {
  const givenDigits = ref<Record<string, number>>({})
  const selection = ref<Set<string>>(new Set())
  const activeTool = ref<string>('digit')
  const activeConstraints = ref<ActiveConstraint[]>([])
  const { canUndo, canRedo, execute, undo, redo, clear: clearHistory } = useUndoRedo()

  const hasSelection = computed(() => selection.value.size > 0)

  function setGivenDigitsForSelection(digit: number | null) {
    const keys = Array.from(selection.value)
    if (!keys.length) return
    const prev = Object.fromEntries(keys.map((k) => [k, givenDigits.value[k] ?? null]))
    execute({
      execute: () => {
        keys.forEach((k) => {
          if (digit === null) {
            delete givenDigits.value[k]
          } else {
            givenDigits.value[k] = digit
          }
        })
      },
      undo: () => {
        keys.forEach((k) => {
          if (prev[k] === null) {
            delete givenDigits.value[k]
          } else {
            givenDigits.value[k] = prev[k]!
          }
        })
      },
    })
  }

  function selectCell(key: string) {
    selection.value = new Set([key])
  }

  function toggleCell(key: string) {
    const next = new Set(selection.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selection.value = next
  }

  function addCell(key: string) {
    selection.value = new Set([...selection.value, key])
  }

  function clearSelection() {
    selection.value = new Set()
  }

  function setActiveTool(tool: string) {
    activeTool.value = tool
  }

  function addConstraint(type: string, label: string, category: string) {
    if (category === 'global' && activeConstraints.value.some((c) => c.type === type)) return
    activeConstraints.value.push({ id: crypto.randomUUID(), type, label, category })
  }

  function removeConstraint(id: string) {
    activeConstraints.value = activeConstraints.value.filter((c) => c.id !== id)
  }

  function reset() {
    givenDigits.value = {}
    selection.value = new Set()
    activeTool.value = 'digit'
    activeConstraints.value = []
    clearHistory()
  }

  return {
    givenDigits,
    selection,
    activeTool,
    activeConstraints,
    setActiveTool,
    addConstraint,
    removeConstraint,
    hasSelection,
    canUndo,
    canRedo,
    setGivenDigitsForSelection,
    selectCell,
    toggleCell,
    addCell,
    clearSelection,
    undo,
    redo,
    reset,
  }
})
