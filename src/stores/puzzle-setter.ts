import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { PuzzleSolve } from '@/types'
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
} from '@/types/setting-mode-controllers'

const usePuzzleSetterStore = defineStore('puzzle-setter', () => {
  const puzzle = ref(new PuzzleSolve({ size: 9 }))
  const settingMode = ref('Given')
  const modeController = ref(
    new GivenDigitController(
      puzzle.value as PuzzleSolve
    ) as SettingModeController
  )

  function newPuzzle(size: number) {
    puzzle.value = new PuzzleSolve({ size })

    modeController.value?.reset()
    modeController.value?.setup()
  }

  function controllerForMode(mode: string): void|SettingModeController {
    switch (mode) {
      case 'Given':
        return new GivenDigitController(puzzle.value as PuzzleSolve)
      case 'Thermometers':
        return new ThermometerController(puzzle.value as PuzzleSolve)
      case 'Arrows':
        return new ArrowController(puzzle.value as PuzzleSolve)
      case 'Little Killers':
        return new LittleKillerController(puzzle.value as PuzzleSolve)
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
    }
  }

  modeController.value?.setup()

  function setMode(mode: string) {
    const newController = controllerForMode(mode)
    if (newController) {
      modeController.value.reset()
      settingMode.value = mode
      puzzle.value.deselectAll()
      modeController.value = newController
      modeController.value?.setup()
    }
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
  }

  return {
    puzzle: puzzle as Ref<PuzzleSolve>,
    settingMode,
    modeController,
    constraintNameMap,
    newPuzzle,
    setMode,
    addElementToPuzzle,
    removeElementFromPuzzle,
  }
})

export default usePuzzleSetterStore
