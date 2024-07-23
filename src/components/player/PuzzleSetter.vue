<script setup lang="ts">
import { ref, computed } from 'vue'
import { PuzzleSolveCell } from '@/types'
import PuzzlePlayer from './PuzzlePlayer.vue'
import SetterControls from './SetterControls.vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'
import useAuthStore from '@/stores/auth'
import NewGridModal from './setter-modals/NewGridModal.vue'
import { onMounted } from 'vue'

const props = defineProps<{ puzzleId?: string }>()

const puzzleStore = usePuzzleSetterStore()
const authStore = useAuthStore()

onMounted(() => {
  console.log(props)
  if (props.puzzleId) {
    puzzleStore.loadPuzzle(props.puzzleId)
  }
})

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

const modalActivators = {
  newGrid: document.createElement('button'),
}

const gridProps = computed(() => ({
  outlineSpacerCells: true,
  displayRegions: puzzleStore.settingMode === 'Regions',
}))

const solverPanelOpen = ref(false)
</script>

<template lang="pug">
.setter-container(v-on:click="solverPanelOpen = false")
  NewGridModal(:activator="modalActivators.newGrid")
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
      .spacer
      v-tooltip(
        :model-value="false"
        location="bottom center"
        :offset="2"
        origin="auto"
        no-click-animation
      )
        template(v-slot:activator="{ props }")
          v-btn(
            v-bind="props"
            v-on:click="puzzleStore.clearGrid()"
            variant="plain"
          )
            v-icon(icon="mdi-cached")
        .tooltip Clear Grid
      v-tooltip(
        :model-value="false"
        location="bottom center"
        :offset="2"
        origin="auto"
        no-click-animation
      )
        template(v-slot:activator="{ props }")
          v-btn(
            v-bind="props"
            v-on:click="modalActivators.newGrid.click()"
            variant="plain"
          )
            v-icon(icon="mdi-plus")
        .tooltip New Grid
      .spacer
      v-menu
        template(v-slot:activator="{ props }")
          v-btn(
            variant="plain"
            v-bind="props"
          )
            v-icon(icon="mdi-export")
        v-list
          v-list-item(
            v-for="destination in ['puzler', 'CtC', 'fPuzzles']"
            :key="destination"
            v-on:click="puzzleStore.exportPuzzle(destination)"
          )
            v-list-item-title {{ destination }}
      v-tooltip(
        :model-value="false"
        location="bottom center"
        :offset="2"
        origin="auto"
        no-click-animation
      )
        .tooltip(v-if="authStore.authenticated") Save Puzzle
        .tooltip(v-else) Sign in to save your puzzle!
        template(v-slot:activator="{ props }")
          v-btn(
            v-bind="props"
            variant="plain"
            v-on:click="puzzleStore.savePuzzle(puzzleId)"
            :disabled="!authStore.authenticated"
          )
            v-icon(icon="mdi-content-save")
    .puzzle-grid-container(v-on:pointerdown="cellClick")
      PuzzlePlayer(
        :puzzle="puzzleStore.puzzle"
        v-on:cell-double-click="doubleClick"
        v-on:spacer-double-click="doubleClick"
        v-on:cell-click="cellClick"
        v-on:spacer-click="cellClick"
        v-on:cell-enter="cellEnter"
        v-on:spacer-enter="cellEnter"
        :disableControls="!solvingMode"
        :hideTimer="true"
        :gridProps="gridProps"
      )
</template>

<style scoped lang="stylus">
.setter-container
  display flex
  width 100%

  .main-pane
    flex 1
    display flex
    flex-direction column
    position relative

    .header
      padding 0 10px
      display flex
      align-items center
      justify-content center
      gap 25px
      .spacer
        flex 1
      .v-switch
        flex unset
        :deep(.v-selection-control)
          flex unset
      .v-btn
        min-width unset
        padding 8px
        height unset
    .puzzle-grid-container
      padding 20px
      flex 1
      display flex
      align-items center
      justify-content center
      container-type size
</style>
