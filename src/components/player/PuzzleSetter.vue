<script setup lang="ts">
import { PuzzleSolveCell } from '@/types'
import PuzzlePlayer from './PuzzlePlayer.vue'
import SetterControls from './SetterControls.vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'
import { ref } from 'vue';

const puzzleStore = usePuzzleSetterStore()

function doubleClick(event: PointerEvent, cell: PuzzleSolveCell) {
  puzzleStore.modeController?.cellDoubleClick(event, cell)
}

function cellClick(event: PointerEvent, cell?: PuzzleSolveCell) {
  puzzleStore.modeController?.cellClick(event, cell)
}

function cellEnter(event: PointerEvent, cell: PuzzleSolveCell) {
  puzzleStore.modeController?.cellEnter(event, cell)
}

const solvingMode = ref(false)
let rememberMode = null as null|string

function modeChanged() {
  if (solvingMode.value) {
    rememberMode = puzzleStore.settingMode
    puzzleStore.setMode(null)
  } else {
    puzzleStore.setMode(rememberMode)
    rememberMode = null
  }
}
</script>

<template lang="pug">
.setter-container
  SetterControls.setter-controls(:hide="solvingMode")
  .main-pane
    .header
      v-switch(
        v-model="solvingMode"
        v-on:update:model-value="modeChanged"
        :inset="true"
        :hide-details="true"
        density="compact"
        label="Solving Mode"
      )
    .puzzle-grid-container(v-on:pointerdown="cellClick")
      PuzzlePlayer(
        :puzzle="puzzleStore.puzzle"
        :outlineSpacerCells="true"
        v-on:cell-double-click="doubleClick"
        v-on:spacer-double-click="doubleClick"
        v-on:cell-click="cellClick"
        v-on:spacer-click="cellClick"
        v-on:cell-enter="cellEnter"
        v-on:spacer-enter="cellEnter"
        :disableControls="!solvingMode"
        :hideTimer="true"
      )
</template>

<style scoped lang="stylus">
.setter-container
  display flex
  width 100%

  .header
    padding 0 5px

  .main-pane
    flex 1
    display flex
    flex-direction column
    .puzzle-grid-container
      padding 20px
      flex 1
      display flex
      align-items center
      justify-content center
      container-type size
</style>
