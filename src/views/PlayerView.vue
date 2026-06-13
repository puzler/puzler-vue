<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { apolloClient } from '@/utils/apolloClient'
import { deserializePuzzle, buildSolution, type SerializedPuzzle } from '@/utils/puzzleExport'
import { hashSolution } from '@/utils/solutionHash'
import { cellKey, keyToRowCol } from '@/composables/useGrid'
import PuzzleForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleForPlay.graphql'
import PuzzleByTokenForPlayDocument from '@/graphql/gql/puzzles/queries/PuzzleByTokenForPlay.graphql'
import type {
  PuzzleForPlayQuery,
  PuzzleForPlayQueryVariables,
  PuzzleByTokenForPlayQuery,
  PuzzleByTokenForPlayQueryVariables,
} from '@/graphql/generated/types'

const route = useRoute()
const editor = useEditorStore()
const grid = useGridStore()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const title = ref('')
const authorName = ref('')
const solutionHash = ref<string | null>(null)
const solved = ref(false)

// Re-check completion after every change: once the board is full, hash it and
// compare to the published version's hash (no solution is ever sent to the client).
watch(
  () => [editor.givenDigits, editor.solverCellStates],
  () => {
    if (solved.value || !solutionHash.value) return
    const board = buildSolution(editor, grid)
    if (board && hashSolution(board) === solutionHash.value) solved.value = true
  },
  { deep: true },
)

async function fetchById(id: string) {
  const { data } = await apolloClient.query<PuzzleForPlayQuery, PuzzleForPlayQueryVariables>({
    query: PuzzleForPlayDocument,
    variables: { id },
    fetchPolicy: 'network-only',
  })
  return data?.puzzle ?? null
}

async function fetchByToken(token: string) {
  const { data } = await apolloClient.query<PuzzleByTokenForPlayQuery, PuzzleByTokenForPlayQueryVariables>({
    query: PuzzleByTokenForPlayDocument,
    variables: { token },
    fetchPolicy: 'network-only',
  })
  return data?.puzzleByToken ?? null
}

async function loadPuzzle() {
  const token = typeof route.query.t === 'string' ? route.query.t : null
  const id = typeof route.params.id === 'string' ? route.params.id : null
  try {
    const puzzle = token ? await fetchByToken(token) : id ? await fetchById(id) : null
    if (!puzzle) {
      errorMessage.value = 'This puzzle isn’t available.'
      return
    }
    if (!puzzle.publishedVersion) {
      errorMessage.value = 'This puzzle hasn’t been published yet.'
      return
    }
    title.value = puzzle.title
    authorName.value = puzzle.author.username
    solutionHash.value = puzzle.publishedVersion.solutionHash ?? null
    deserializePuzzle(editor, grid, puzzle.publishedVersion.definition as SerializedPuzzle)
    editor.setMode('solving')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Could not load this puzzle.'
  } finally {
    loading.value = false
  }
}

const DIRECTIONS: Record<string, { dr: number; dc: number }> = {
  ArrowUp: { dr: -1, dc: 0 }, ArrowDown: { dr: 1, dc: 0 }, ArrowLeft: { dr: 0, dc: -1 }, ArrowRight: { dr: 0, dc: 1 },
}

function physicalDigit(event: KeyboardEvent): number | null {
  const m = event.code.match(/^(?:Digit|Numpad)(\d)$/)
  return m ? Number(m[1]) : null
}

function onKeyDown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  const dir = DIRECTIONS[event.key]
  if (dir) {
    event.preventDefault()
    const last = [...editor.selection].at(-1)
    const { row, col } = last ? keyToRowCol(last) : { row: 0, col: 0 }
    const key = cellKey((row + dir.dr + grid.rows) % grid.rows, (col + dir.dc + grid.cols) % grid.cols)
    if (event.shiftKey) editor.addCell(key)
    else editor.selectCell(key)
    return
  }
  if (event.key === 'Escape') { editor.clearSelection(); return }
  if (event.key === 'z' || event.key === 'Z') { editor.setInputMode('digit'); return }
  if (event.key === 'x' || event.key === 'X') { editor.setInputMode('center'); return }
  if (event.key === 'c' || event.key === 'C') { editor.setInputMode('corner'); return }
  if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
    event.preventDefault()
    if (event.shiftKey) editor.redo()
    else editor.undo()
    return
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    editor.placeDigitForSelection(null)
    return
  }
  const digit = physicalDigit(event)
  if (digit !== null && digit >= 1 && digit <= grid.cols) {
    event.preventDefault()
    const mode = event.ctrlKey || event.metaKey ? 'center' : event.shiftKey ? 'corner' : undefined
    editor.placeDigitForSelection(digit, mode)
  }
}

const subtitle = computed(() => (authorName.value ? `by ${authorName.value}` : ''))

onMounted(() => {
  loadPuzzle()
  window.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  // Leave a clean slate so the editor store isn't holding a played puzzle.
  editor.reset()
})
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="px-4 py-2 border-b border-line bg-paper shrink-0 flex items-baseline gap-2">
      <h1 class="text-sm font-semibold text-ink-text">
        {{ title || 'Puzzle' }}
      </h1>
      <span class="text-xs text-faint">{{ subtitle }}</span>
    </header>

    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center text-soft"
    >
      Loading…
    </div>
    <div
      v-else-if="errorMessage"
      class="flex-1 flex items-center justify-center text-soft"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else
      class="flex-1 flex overflow-hidden min-h-0"
    >
      <main class="flex-1 bg-canvas overflow-hidden min-h-0">
        <SudokuGrid
          mode="edit"
          :given-digits="editor.givenDigits"
          :cell-states="editor.solverCellStates"
          :selection="editor.selection"
          @update:selection="editor.selection = $event"
          @clear-selection="editor.clearSelection()"
        />
      </main>
      <div class="shrink-0 w-52 border-l border-line">
        <SolverNumpad class="w-52 h-full" />
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="solved"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        @click.self="solved = false"
      >
        <div class="bg-surface rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3 w-80">
          <span class="text-2xl">🎉</span>
          <span class="text-lg font-semibold text-ink-text">Solved!</span>
          <span class="text-sm text-faint text-center">Nicely done — you completed “{{ title }}”.</span>
          <button
            class="mt-2 px-4 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep"
            @click="solved = false"
          >
            Keep looking
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
