import {
  computed,
  ref,
  type Ref,
} from 'vue'
import { defineStore } from 'pinia'
import { PuzzleSolve } from '@/types'
import SudokuSolver, { type SolverConstructor } from '@/utils/solver/sudoku-solver'
import PuzlerBoardDefinition from '@/utils/solver/sudoku-solver-board-definition'
import type { CandidatesList } from '@puzler/sudokusolver-webworker/types'
import {
  GivenDigitController,
  ThermometerController,
  ArrowController,
  LineController,
  SettingModeController,
  SingleCellConstraintController,
  CellConnectorController,
  MultiCellController,
  NumberOutsideGridController,
  LittleKillerController,
  CosmeticShapeController,
  CosmeticCageController,
  CellColorController,
  CosmeticTextController,
  CosmeticLineController,
  RegionEditorController,
} from '@/types/setting-mode-controllers'
import type { PuzzleInput } from '@/graphql/generated/types'

import graphql from '@/plugins/graphql'
import GenerateFPuzzleQuery from '@/graphql/gql/puzzles/queries/GenerateFPuzzle.graphql'
import SavePuzzleMutation from '@/graphql/gql/puzzles/mutations/SavePuzzle.graphql'
import FetchPuzzleQuery from '@/graphql/gql/puzzles/queries/FetchPuzzle.graphql'
import { faListCheck } from '@fortawesome/free-solid-svg-icons'
import router from '@/plugins/router'

const usePuzzleSetterStore = defineStore('puzzle-setter', () => {
  const puzzle = ref(new PuzzleSolve({ size: 9 }))

  const settingMode = ref(null as null|string)
  const modeController = ref(null as SettingModeController|null)
  setMode('Given')

  const solver = new SudokuSolver({
    boardDefinition: PuzlerBoardDefinition,
    onSolution: (solution: Array<number>) => {
      solution.forEach((value, index) => {
        const row = Math.floor(index / puzzle.value.size)
        const column = index % puzzle.value.size
  
        puzzle.value.cells[row][column].digit = value
      })
      currentSolverCommand.value = null
    },
    onInvalid: () => {
      solverDisplay.value = ['Board is Invalid!']
      currentSolverCommand.value = null
    },
    onCancelled: () => {
      solverDisplay.value = ['Cancelled Action']
      currentSolverCommand.value = null
    },
    onNoSolution: () => {
      solverDisplay.value = ['No Solution Found']
      currentSolverCommand.value = null
    },
    onCount: (count, complete, cancelled) => {
      if (complete || cancelled) {
        if (complete) {
          if (count === 0) {
            solverDisplay.value = ['There are no solutions']
          } else if (count === 1) {
            solverDisplay.value = ['There is a unique solution']
          } else if (currentSolverCommand.value === 'count-solutions') {
            solverDisplay.value = [`There are exacly ${count} solutions`]
          } else {
            solverDisplay.value = ['There are multiple solutions']
          }
        } else {
          solverDisplay.value = [`There are at least ${count} solutions`]
        }
        currentSolverCommand.value = null
      } else {
        solverDisplay.value = [`Found ${count} solutions so far...`]
      }
    },
    onTrueCandidates: (candidates, counts) => {
      applySolverCandidates(candidates, true)
      puzzle.value.candidateCounts = counts
      currentSolverCommand.value = null
    },
    onStep: (desc, invalid, changed, candidates) => {
      solverDisplay.value.push(desc)
      if (candidates) applySolverCandidates(candidates)
      
      currentSolverCommand.value = null
    },
    onLogicalSolve: (desc, invalid, changed, candidates) => {
      solverDisplay.value = desc
      if (candidates) applySolverCandidates(candidates)

      currentSolverCommand.value = null
    },
  } as SolverConstructor)

  const solverDisplay = ref([] as Array<string>)
  const currentSolverCommand = ref(null as null|string)
  const autoTrueCandidates = ref(false)

  function toggleAutoTrueCandidates() {
    autoTrueCandidates.value = !autoTrueCandidates.value
    if (autoTrueCandidates.value) {
      trueCandidates()
    }
  }

  function applySolverCandidates(candidates: CandidatesList, singleCandidateAsGiven = false) {
    candidates.forEach((cellCandidates, index) => {
      const row = Math.floor(index / puzzle.value.size)
      const column = index % puzzle.value.size
      const puzzleCell = puzzle.value.cells[row][column]

      if (!puzzleCell.given) {
        puzzleCell.digit = null
        if (Array.isArray(cellCandidates)) {
          if (singleCandidateAsGiven && cellCandidates.length === 1) {
            puzzleCell.centerMarks = []
            puzzleCell.digit = cellCandidates[0]
          } else {
            puzzleCell.centerMarks = [...cellCandidates]
          }
        } else {
          puzzleCell.digit = cellCandidates.value
        }
      }
    })
  }

  function resetSolver() {
    solver.restartWorker()
  }

  function solve() {
    if (currentSolverCommand.value) solver.cancel()

    currentSolverCommand.value = 'solve'
    solver.solve(puzzle.value as PuzzleSolve)
  }

  function countSolutions() {
    if (currentSolverCommand.value) solver.cancel()

    currentSolverCommand.value = 'count-solutions'
    solver.count(puzzle.value as PuzzleSolve)
  }

  const countCandidates = ref(false)

  function trueCandidates() {
    if (currentSolverCommand.value) solver.cancel()

    currentSolverCommand.value = 'true-candidates'
    solver.trueCandidates(
      puzzle.value as PuzzleSolve,
      countCandidates.value,
    )
  }

  function logicalStep() {
    if (currentSolverCommand.value) solver.cancel()

    currentSolverCommand.value = 'logical-step'
    solver.step(puzzle.value as PuzzleSolve)
  }

  function logicalSolve() {
    if (currentSolverCommand.value) solver.cancel()

    currentSolverCommand.value = 'logical-solve'
    solver.logicalSolve(puzzle.value as PuzzleSolve)
  }

  function checkPuzzle() {
    if (currentSolverCommand.value) solver.cancel()

    currentSolverCommand.value = 'check-puzzle'
    solver.count(
      puzzle.value as PuzzleSolve,
      { maxSolutions: 2 },
    )
  }

  function cancelSolverOperation() {
    solver.cancel()
  }
  
  const canUndo = computed(() => puzzle.value.canUndo)
  const canRedo = computed(() => puzzle.value.canRedo)

  function undo() {
    if (canUndo.value) puzzle.value.undo()
  }

  function redo() {
    if (canRedo.value) puzzle.value.redo()
  }

  function puzzleChanged(saveState = true) {
    if (saveState) puzzle.value.saveState()

    if (!countCandidates.value) {
      puzzle.value.candidateCounts = undefined
    }

    if (autoTrueCandidates.value) {
      trueCandidates()
    }
  }

  function clearGrid() {
    for (let row = 0; row < puzzle.value.size; row += 1) {
      for (let col = 0; col < puzzle.value.size; col += 1) {
        const cell = puzzle.value.cells[row][col]

        if (!cell.given) cell.digit = null
        cell.centerMarks = []
        cell.cornerMarks = []
        cell.cellColors = []
      }
    }

    solverDisplay.value = []
    puzzleChanged()
  }

  async function loadPuzzle(puzzleId: string) {
    const response = await graphql.query({
      query: FetchPuzzleQuery,
      variables: { id: puzzleId },
      fetchPolicy: 'no-cache',
    })

    const dbPuzzle = response.data.fetchPuzzle
    if (dbPuzzle) {
      puzzle.value = new PuzzleSolve({ puzzle: dbPuzzle, size: dbPuzzle.size })
      setMode('Given')
      puzzleChanged(false)
    }
  }

  function newPuzzle(size: number) {
    puzzle.value = new PuzzleSolve({ size })
    puzzleChanged(false)
    setMode('Given')

    if (router.currentRoute.value.name === 'setterId') {
      router.replace({ name: 'setter' })
    }
  }

  function controllerForMode(mode: string|null): void|SettingModeController {
    switch (mode) {
      case 'Given': return new GivenDigitController(puzzle.value as PuzzleSolve)
      case 'Regions': return new RegionEditorController(puzzle.value as PuzzleSolve)
      case 'Thermometers': return new ThermometerController(puzzle.value as PuzzleSolve)
      case 'Arrows': return new ArrowController(puzzle.value as PuzzleSolve)
      case 'Little Killers': return new LittleKillerController(puzzle.value as PuzzleSolve)
      case 'Palindrome Lines':
      case 'Renban Lines':
      case 'German Whispers':
      case 'Dutch Whispers':
      case 'Region Sums':
      case 'Between Lines':
        return new LineController(
          puzzle.value as PuzzleSolve,
          { lineType: mode }
        )
      case 'Odd Cells':
      case 'Even Cells':
      case 'Minimums':
      case 'Maximums':
      case 'Row Index Cells':
      case 'Column Index Cells':
        return new SingleCellConstraintController(
          puzzle.value as PuzzleSolve,
          { constraintType: mode },
        )
      case 'Difference Dots':
      case 'Ratio Dots':
      case 'XV':
      case 'Quadruples':
        return new CellConnectorController(
          puzzle.value as PuzzleSolve,
          { connectorType: mode },
        )
      case 'Killer Cages':
      case 'Clones':
      case 'Extra Regions':
        return new MultiCellController(
          puzzle.value as PuzzleSolve,
          { constraintType: mode },
        )
      case 'Skyscrapers':
      case 'Sandwich Sums':
      case 'X-Sums':
        return new NumberOutsideGridController(
          puzzle.value as PuzzleSolve,
          { constraintType: mode },
        )
      case 'Circles':
      case 'Rectangles':
        return new CosmeticShapeController(
          puzzle.value as PuzzleSolve,
          { shapeType: mode },
        )
      case 'Cages': return new CosmeticCageController(puzzle.value as PuzzleSolve)
      case 'Cell Colors': return new CellColorController(puzzle.value as PuzzleSolve)
      case 'Text': return new CosmeticTextController(puzzle.value as PuzzleSolve)
      case 'Lines': return new CosmeticLineController(puzzle.value as PuzzleSolve)
    }
  }

  function setMode(mode: string|null) {
    const newController = controllerForMode(mode)

    modeController.value?.reset()
    modeController.value?.removeInputListener(puzzleChanged)
    settingMode.value = mode
    puzzle.value.deselectAll()
    modeController.value = newController || null
    modeController.value?.setup()
    modeController.value?.addInputListener(puzzleChanged)
  }

  const constraintNameMap = {
    chess: 'Chess',
    diagonals: 'Diagonals',
    antiKropki: 'Anti-Kropki',
    antiXV: 'Anti-XV',
    disjointSets: 'Disjoint Sets',
    lines: 'Lines',
    circles: 'Circles',
    rectangles: 'Rectangles',
    cages: 'Cages',
    text: 'Text',
    cellBackgroundColors: 'Cell Colors',
    thermometers: 'Thermometers',
    arrows: 'Arrows',
    renbanLines: 'Renban Lines',
    palindromeLines: 'Palindrome Lines',
    germanWhisperLines: 'German Whispers',
    dutchWhisperLines: 'Dutch Whispers',
    regionSumLines: 'Region Sums',
    betweenLines: 'Between Lines',
    oddCells: 'Odd Cells',
    evenCells: 'Even Cells',
    minCells: 'Minimums',
    maxCells: 'Maximums',
    rowIndexCells: 'Row Index Cells',
    columnIndexCells: 'Column Index Cells',
    differenceDots: 'Difference Dots',
    ratioDots: 'Ratio Dots',
    xv: 'XV',
    quadruples: 'Quadruples',
    killerCages: 'Killer Cages',
    clones: 'Clones',
    extraRegions: 'Extra Regions',
    xSums: 'X-Sums',
    sandwichSums: 'Sandwich Sums',
    skyscrapers: 'Skyscrapers',
    littleKillerSums: 'Little Killers',
  } as Record<string, string>

  const constraintKeyMap = {
    Chess: { group: 'global', key: 'chess', initialValue: { king: false, knight: false } },
    Diagonals: { group: 'global', key: 'diagonals', initialValue: { positive: false, negative: false } },
    'Anti-Kropki': { group: 'global', key: 'antiKropki', initialValue: { antiWhite: false, antiBlack: false } },
    'Anti-XV': { group: 'global', key: 'antiXV', initialValue: { antiX: false, antiV: false } },
    'Disjoint Sets': { group: 'global', key: 'disjointSets', initialValue: { enabled: false } },
    Lines: { group: 'cosmetic', key: 'lines', initialValue: [] },
    Circles: { group: 'cosmetic', key: 'circles', initialValue: [] },
    Rectangles: { group: 'cosmetic', key: 'rectangles', initialValue: [] },
    Cages: { group: 'cosmetic', key: 'cages', initialValue: [] },
    Text: { group: 'cosmetic', key: 'text', initialValue: [] },
    'Cell Colors': { group: 'cosmetic', key: 'cellBackgroundColors', initialValue: [] },
    Thermometers: { group: 'local', key: 'thermometers', initialValue: [] },
    Arrows: { group: 'local', key: 'arrows', initialValue: [] },
    'Renban Lines': { group: 'local', key: 'renbanLines', initialValue: [] },
    'Palindrome Lines': { group: 'local', key: 'palindromeLines', initialValue: [] },
    'German Whispers': { group: 'local', key: 'germanWhisperLines', initialValue: [] },
    'Dutch Whispers': { group: 'local', key: 'dutchWhisperLines', initialValue: [] },
    'Region Sums': { group: 'local', key: 'regionSumLines', initialValue: [] },
    'Between Lines': { group: 'local', key: 'betweenLines', initialValue: [] },
    'Odd Cells': { group: 'local', key: 'oddCells', initialValue: [] },
    'Even Cells': { group: 'local', key: 'evenCells', initialValue: [] },
    Minimums: { group: 'local', key: 'minCells', initialValue: [] },
    Maximums: { group: 'local', key: 'maxCells', initialValue: [] },
    'Row Index Cells': { group: 'local', key: 'rowIndexCells', initialValue: [] },
    'Column Index Cells': { group: 'local', key: 'columnIndexCells', initialValue: [] },
    'Difference Dots': { group: 'local', key: 'differenceDots', initialValue: [] },
    'Ratio Dots': { group: 'local', key: 'ratioDots', initialValue: [] },
    XV: { group: 'local', key: 'xv', initialValue: [] },
    Quadruples: { group: 'local', key: 'quadruples', initialValue: [] },
    'Killer Cages': { group: 'local', key: 'killerCages', initialValue: [] },
    Clones: { group: 'local', key: 'clones', initialValue: [] },
    'Extra Regions': { group: 'local', key: 'extraRegions', initialValue: [] },
    'X-Sums': { group: 'local', key: 'xSums', initialValue: [] },
    'Sandwich Sums': { group: 'local', key: 'sandwichSums', initialValue: [] },
    Skyscrapers: { group: 'local', key: 'skyscrapers', initialValue: [] },
    'Little Killers': { group: 'local', key: 'littleKillerSums', initialValue: [] },
  } as Record<string, { group: string; key: string; initialValue: any }>

  function addElementToPuzzle(element: string) {
    const {
      localConstraints,
      globalConstraints,
      cosmetics,
    } = puzzle.value.puzzleData
    
    const { group, key, initialValue} = constraintKeyMap[element]
    const groupData = {
      global: globalConstraints,
      local: localConstraints,
      cosmetic: cosmetics,
    }[group] as Record<string, any>

    if (Array.isArray(initialValue)) {
      groupData[key] = []
    } else if (typeof initialValue === 'object') {
      groupData[key] = { ...initialValue }
    } else {
      groupData[key] = initialValue
    }

    puzzle.value.saveState()
    setMode(element)
  }

  function removeElementFromPuzzle(element: string) {
    if (settingMode.value === element) setMode('Given')

    const {
      localConstraints,
      globalConstraints,
      cosmetics
    } = puzzle.value.puzzleData
  
    const { group, key } = constraintKeyMap[element]
    const dataGroup = {
      local: localConstraints,
      global: globalConstraints,
      cosmetic: cosmetics
    }[group] as Record<string, any>

    delete dataGroup[key]
    puzzle.value.saveState()
  }

  const destinationUrls = {
    puzler: {
      baseUrl: `${window.location.origin}/solve?fPuzzle=`,
      encode: faListCheck,
    },
    CtC: {
      baseUrl: 'https://app.crackingthecryptic.com/sudoku/?puzzleid=fpuzzles',
      encode: true,
    },
    fPuzzles: {
      baseUrl: 'https://www.f-puzzles.com/?load=',
      encode: false,
    },
  }

  function trimTypenames(obj: Record<string, any>|Array<any>): any {
     if (Array.isArray(obj)) {
      const newArr = obj.map(
        (item) => {
          if (Array.isArray(item) || item instanceof Object) {
            return trimTypenames(item)
          }

          return item
        }
      )

      return newArr
    } else if (obj instanceof Object) {
      return Object.keys(obj).reduce(
        (newObj, key) => {
          if (key === '__typename') return newObj
          const val = obj[key]
          if (Array.isArray(val) || val instanceof Object) {
            const newVal = trimTypenames(val)

            return {
              ...newObj,
              [key]: newVal,
            }
          }
          return { ...newObj, [key]: val }
        },
        {} as Record<string, any>
      )
    }
  }

  const puzzleInput = computed(() => {
    const input = JSON.parse(JSON.stringify(puzzle.value.puzzleData))

    delete input.visibility
    delete input.user

    for (let i = 0; i < (input.localConstraints.differenceDots?.length || 0); i += 1) {
      delete input.localConstraints.differenceDots[i].location
    }

    for (let i = 0; i < (input.localConstraints.ratioDots?.length || 0); i += 1) {
      delete input.localConstraints.ratioDots[i].location
    }

    for (let i = 0; i < (input.localConstraints.quadruples?.length || 0); i += 1) {
      delete input.localConstraints.quadruples[i].location
    }

    for (let i = 0; i < (input.localConstraints.xv?.length || 0); i += 1) {
      delete input.localConstraints.xv[i].location
    }

    const parsed = trimTypenames(input) as PuzzleInput
    return parsed
  })

  async function savePuzzle() {
    const response = await graphql.mutate({
      mutation: SavePuzzleMutation,
      variables: {
        input: {
          puzzle: puzzleInput.value,
        },
      },
    })

    const { success, puzzle } = response.data.savePuzzle
    if (!success) return false

    if (router.currentRoute.value.name === 'setter') {
      router.replace({ name: 'setterId', params: { puzzleId: puzzle.id } })
    }

    return true
  }

  async function convertToFPuzzle() {
    const response = await graphql.query({
      query: GenerateFPuzzleQuery,
      variables: {
        puzzle: puzzleInput.value as PuzzleInput,
      },
    })

    return response.data.generateFPuzzle
  }

  async function exportPuzzle(destination: keyof typeof destinationUrls) {
    const { baseUrl, encode } = destinationUrls[destination]
    let base64 = await convertToFPuzzle()
    if (encode) base64 = encodeURIComponent(base64)
    const fullLink = `${baseUrl}${base64}`

    window.open(fullLink, '_blank')
  }

  return {
    puzzle: puzzle as Ref<PuzzleSolve>,
    settingMode,
    modeController,
    constraintNameMap,
    solverDisplay,
    currentSolverCommand,
    autoTrueCandidates,
    toggleAutoTrueCandidates,
    countCandidates,
    clearGrid,
    resetSolver,
    solve,
    countSolutions,
    trueCandidates,
    logicalStep,
    logicalSolve,
    checkPuzzle,
    cancelSolverOperation,
    newPuzzle,
    setMode,
    addElementToPuzzle,
    removeElementFromPuzzle,
    exportPuzzle,
    canRedo,
    canUndo,
    redo,
    undo,
    savePuzzle,
    loadPuzzle,
  }
})

export default usePuzzleSetterStore
