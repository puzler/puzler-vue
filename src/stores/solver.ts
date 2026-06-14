import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { cellKey } from '@/composables/useGrid'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { buildSolverPuzzle } from '@/solver/adapter'
import { createSolverClient } from '@/solver/useSolver'
import {
  loadSolverSettings,
  saveSolverSettings,
  type SolverTechniqueLevel,
} from '@/utils/solverSettings'

export type { SolverTechniqueLevel }

// Which solver command is currently running (also drives each button's
// Cancel/spinner state), or null when idle.
export type SolverCommand =
  | 'solve'
  | 'logical-solve'
  | 'count'
  | 'logical-step'
  | 'true-candidates'
  | 'check'

// Upper bound for "Count Solutions" so a wildly under-constrained grid reports
// "more than N" instead of running effectively forever. Well-formed puzzles
// (few solutions) still report an exact count.
const SOLUTION_COUNT_CAP = 100000

export const useSolverStore = defineStore('solver', () => {
  const currentCommand = ref<SolverCommand | null>(null)
  const display = ref<string[]>([])
  const autoTrueCandidates = ref(false)

  // Persisted solver preferences (settings modal).
  const persisted = loadSolverSettings()
  const showCandidateCounts = ref(persisted.showCandidateCounts)
  // Show candidates the chosen technique level can't logically eliminate; the
  // ones that actually break the puzzle (0 solutions) render red.
  const showLogicalCandidates = ref(persisted.showLogicalCandidates)
  // How far the logical solver's standard techniques go.
  const techniqueLevel = ref<SolverTechniqueLevel>(persisted.techniqueLevel)
  watch([showCandidateCounts, showLogicalCandidates, techniqueLevel], () => {
    saveSolverSettings({
      showCandidateCounts: showCandidateCounts.value,
      showLogicalCandidates: showLogicalCandidates.value,
      techniqueLevel: techniqueLevel.value,
    })
  })
  // Panel chrome: the section can be collapsed (header only) and, when open,
  // expanded to fill the whole left toolbar for an easier read of the output.
  // Collapsed by default so it stays out of the way until opened.
  const panelCollapsed = ref(true)
  const panelExpanded = ref(false)
  // cellKey → { digit → number of completing solutions } (only when counting).
  const candidateCounts = ref<Record<string, Record<number, number>>>({})
  // cellKey → digits that are logically irreducible but actually impossible
  // (shown red) — populated by "Show logical candidates" runs.
  const redCandidates = ref<Record<string, number[]>>({})

  // True candidates triggered by the auto-watcher (or auto refreshes) write
  // non-undoably; an explicit "Candidates" click is undoable.
  let autoRun = false
  // Whether the in-flight candidate run used the logical-candidate mode.
  let runWasLogical = false

  function countsByCell(counts: number[][] | undefined): Record<string, Record<number, number>> {
    if (!counts) return {}
    const size = useGridStore().rows
    const out: Record<string, Record<number, number>> = {}
    counts.forEach((perValue, cell) => {
      const map: Record<number, number> = {}
      perValue.forEach((count, valueIndex) => {
        if (count > 0) map[valueIndex + 1] = count
      })
      out[cellKey(Math.floor(cell / size), cell % size)] = map
    })
    return out
  }

  // Candidates (marks) that have zero completing solutions → the red diagnostic.
  function redByCell(candidates: number[][], counts: number[][] | undefined): Record<string, number[]> {
    if (!counts) return {}
    const size = useGridStore().rows
    const out: Record<string, number[]> = {}
    candidates.forEach((values, cell) => {
      const reds = values.filter((v) => (counts[cell]?.[v - 1] ?? 0) === 0)
      if (reds.length) out[cellKey(Math.floor(cell / size), cell % size)] = reds
    })
    return out
  }

  const client = createSolverClient({
    onSolution: (solution) => {
      useEditorStore().applySolverSolution(solution)
      display.value = ['Solution found']
      currentCommand.value = null
    },
    onInvalid: () => {
      display.value = ['Board is invalid']
      currentCommand.value = null
    },
    onNoSolution: () => {
      display.value = ['No solution found']
      currentCommand.value = null
    },
    onCount: (count, complete, capped) => {
      if (complete) {
        if (currentCommand.value === 'check') {
          display.value = [count === 0 ? 'No solutions' : count === 1 ? 'Unique solution' : 'Multiple solutions']
        } else {
          display.value = [`Exactly ${count.toLocaleString()} solution${count === 1 ? '' : 's'}`]
        }
        currentCommand.value = null
      } else if (currentCommand.value === 'check') {
        // The check cap (2) was hit → at least two solutions exist.
        display.value = ['Multiple solutions']
        currentCommand.value = null
      } else if (capped) {
        display.value = [`More than ${count.toLocaleString()} solutions`]
        currentCommand.value = null
      } else {
        display.value = [`At least ${count.toLocaleString()} solutions so far…`]
      }
    },
    onTrueCandidates: (candidates, counts) => {
      const editor = useEditorStore()
      if (runWasLogical) {
        // Show the full logical-candidate set as marks (don't auto-place singles,
        // so impossible ones can render red), splitting reds from the count scale.
        editor.applySolverCandidates(candidates, false, !autoRun)
        redCandidates.value = redByCell(candidates, counts)
        candidateCounts.value = showCandidateCounts.value ? countsByCell(counts) : {}
        display.value = ['Logical candidates filled']
      } else {
        editor.applySolverCandidates(candidates, true, !autoRun)
        candidateCounts.value = countsByCell(counts)
        redCandidates.value = {}
        display.value = ['True candidates filled']
      }
      currentCommand.value = null
    },
    onStep: (desc, _changed, values, candidates) => {
      // Continue from the current grid: place the deduced cell(s) and append the
      // step to the running log rather than replacing it.
      useEditorStore().applySolverState(values, candidates)
      display.value = [...display.value, desc]
      currentCommand.value = null
    },
    onLogicalSolve: (desc, _changed, values, candidates) => {
      useEditorStore().applySolverState(values, candidates)
      display.value = desc.length ? desc : ['No logical steps']
      currentCommand.value = null
    },
    onCancelled: () => {
      display.value = ['Cancelled']
      currentCommand.value = null
    },
  })

  // Whether the previous run was a logical step, so consecutive steps append to
  // the read-out while any other command starts the log fresh.
  let lastWasStep = false

  // Build the puzzle and start a command; reports the read-out and guards
  // unsupported grids. Returns false if the run could not start.
  function start(command: SolverCommand, message: string, run: (puzzle: ReturnType<typeof buildSolverPuzzle>['puzzle']) => void): boolean {
    const { puzzle, supported, reason } = buildSolverPuzzle()
    if (!supported) {
      display.value = [reason ?? 'This grid is not supported by the solver']
      return false
    }
    lastWasStep = false
    currentCommand.value = command
    display.value = [message]
    run(puzzle)
    return true
  }

  function runSolve() {
    start('solve', 'Solving…', (puzzle) => client.solve(puzzle, { random: true }))
  }
  function runLogicalSolve() {
    start('logical-solve', 'Logical solving…', (puzzle) =>
      client.logicalSolve(puzzle, { techniqueLevel: techniqueLevel.value }),
    )
  }
  function runCount() {
    start('count', 'Counting solutions…', (puzzle) => client.count(puzzle, { maxSolutions: SOLUTION_COUNT_CAP }))
  }
  // Continues from the current grid state and appends to the running log.
  function runLogicalStep() {
    const { puzzle, supported, reason } = buildSolverPuzzle({ includeSolverState: true })
    if (!supported) {
      display.value = [reason ?? 'This grid is not supported by the solver']
      return
    }
    if (!lastWasStep) display.value = []
    lastWasStep = true
    currentCommand.value = 'logical-step'
    client.step(puzzle, { techniqueLevel: techniqueLevel.value })
  }
  function runTrueCandidates(auto = false) {
    // Count up to 11 per candidate so the UI can distinguish the 5–10 bucket
    // from the ">10" bucket (11 = "more than 10"). 1 = just feasibility.
    autoRun = auto
    runWasLogical = showLogicalCandidates.value
    start('true-candidates', 'Computing candidates…', (puzzle) =>
      client.trueCandidates(puzzle, {
        maxSolutionsPerCandidate: showCandidateCounts.value ? 11 : 1,
        logical: showLogicalCandidates.value,
        techniqueLevel: techniqueLevel.value,
      }),
    )
  }
  function runCheck() {
    start('check', 'Checking…', (puzzle) => client.count(puzzle, { maxSolutions: 2 }))
  }

  function cancel() {
    client.cancel()
  }

  // Auto true candidates: while on, re-run whenever the puzzle definition
  // changes. The deep watcher only exists while the toggle is active so it costs
  // nothing when off; re-runs are debounced to coalesce rapid edits.
  let stopAutoWatch: (() => void) | null = null
  let autoTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleAutoRun() {
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = setTimeout(() => {
      if (autoTrueCandidates.value) runTrueCandidates(true)
    }, 300)
  }

  function startAutoWatch() {
    if (stopAutoWatch) return
    stopAutoWatch = watch(
      () => {
        const editor = useEditorStore()
        const grid = useGridStore()
        // Everything the adapter reads to define the puzzle (not the scratch).
        return [
          editor.givenDigits,
          editor.activeGlobalVariants,
          editor.customGlobalConstraints,
          editor.singleCellMarks,
          editor.connectorDots,
          editor.outerClues,
          editor.cosmeticInstances,
          grid.rows,
          grid.cols,
          grid.customCellRegions,
        ]
      },
      scheduleAutoRun,
      { deep: true },
    )
  }

  function stopAutoWatchInternal() {
    stopAutoWatch?.()
    stopAutoWatch = null
    if (autoTimer) {
      clearTimeout(autoTimer)
      autoTimer = null
    }
  }

  function toggleAutoTrueCandidates() {
    autoTrueCandidates.value = !autoTrueCandidates.value
    if (autoTrueCandidates.value) {
      startAutoWatch()
      runTrueCandidates(true)
    } else {
      stopAutoWatchInternal()
    }
  }

  function setShowCandidateCounts(value: boolean) {
    showCandidateCounts.value = value
    if (autoTrueCandidates.value) runTrueCandidates(true)
  }

  function setShowLogicalCandidates(value: boolean) {
    showLogicalCandidates.value = value
    if (autoTrueCandidates.value) runTrueCandidates(true)
  }

  function setTechniqueLevel(value: SolverTechniqueLevel) {
    techniqueLevel.value = value
    if (autoTrueCandidates.value) runTrueCandidates(true)
  }

  function togglePanelCollapsed() {
    panelCollapsed.value = !panelCollapsed.value
    if (panelCollapsed.value) panelExpanded.value = false
  }

  function togglePanelExpanded() {
    panelExpanded.value = !panelExpanded.value
    if (panelExpanded.value) panelCollapsed.value = false
  }

  return {
    currentCommand,
    display,
    autoTrueCandidates,
    showCandidateCounts,
    candidateCounts,
    panelCollapsed,
    panelExpanded,
    togglePanelCollapsed,
    togglePanelExpanded,
    runSolve,
    runLogicalSolve,
    runCount,
    runLogicalStep,
    runTrueCandidates,
    runCheck,
    cancel,
    toggleAutoTrueCandidates,
    redCandidates,
    showLogicalCandidates,
    techniqueLevel,
    setShowCandidateCounts,
    setShowLogicalCandidates,
    setTechniqueLevel,
  }
})
