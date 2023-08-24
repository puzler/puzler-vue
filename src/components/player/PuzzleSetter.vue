<script setup lang="ts">
import { PuzzleSolveCell } from '@/types'
import PuzzleGrid from './PuzzleGrid.vue'
import SetterControls from './SetterControls.vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'

const puzzleStore = usePuzzleSetterStore()
const fakeTimer = {
  paused: false
}

function doubleClick(event: PointerEvent, cell: PuzzleSolveCell) {
  puzzleStore.modeController?.cellDoubleClick(event, cell)
}

function cellClick(event: PointerEvent, cell?: PuzzleSolveCell) {
  puzzleStore.modeController?.cellClick(event, cell)
}

function cellEnter(event: PointerEvent, cell: PuzzleSolveCell) {
  puzzleStore.modeController?.cellEnter(event, cell)
}
</script>

<template lang="pug">
.setter-container
  SetterControls
  .puzzle-grid-container(v-on:pointerdown="cellClick")
    PuzzleGrid(
      :key="puzzleStore.modeController.renderKey"
      :puzzle="puzzleStore.puzzle"
      :timer="fakeTimer"
      v-on:cell-double-click="doubleClick"
      v-on:cell-click="cellClick"
      v-on:cell-enter="cellEnter"
    )
</template>

<style scoped lang="stylus">
.setter-container
  display flex
  width 100%

  .puzzle-grid-container
    padding 20px
    flex 1
    display flex
    align-items center
    justify-content center
    container-type size
</style>
