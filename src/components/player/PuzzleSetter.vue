<script setup lang="ts">
import { ref, computed } from 'vue'
import { PuzzleSolveCell } from '@/types'
import PuzzlePlayer from './PuzzlePlayer.vue'
import SetterControls from './SetterControls.vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'
import NewGridModal from './setter-modals/NewGridModal.vue'

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
        .tooltip Save Puzzle
        template(v-slot:activator="{ props }")
          v-btn(
            v-bind="props"
            variant="plain"
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
    .solver-control-panel(v-on:click.stop)
      v-expansion-panels.panel-outer(
        variant="accordion"
        v-model="solverPanelOpen"
      )
        v-expansion-panel.panel-container(:value="true")
          v-expansion-panel-title.panel-toggle(:hide-actions="true")
            .label Solver
            .angle-container
          v-expansion-panel-text
            .solver-controls
              .actions
                v-btn(
                  v-on:click="puzzleStore.currentSolverCommand === 'solve' ? puzzleStore.cancelSolverOperation() : puzzleStore.solve()"
                )
                  v-progress-circular.loading(
                    :indeterminate="true"
                    v-if="puzzleStore.currentSolverCommand === 'solve'"
                  )
                  .label {{ puzzleStore.currentSolverCommand === 'solve' ? 'Cancel' : 'Solve' }}
                v-btn(
                  v-on:click="puzzleStore.currentSolverCommand === 'logical-solve' ? puzzleStore.cancelSolverOperation() : puzzleStore.logicalSolve()"
                )
                  v-progress-circular.loading(
                    :indeterminate="true"
                    v-if="puzzleStore.currentSolverCommand === 'logical-solve'"
                  )
                  .label {{ puzzleStore.currentSolverCommand === 'logical-solve' ? 'Cancel' : 'Logical Solve' }}
                v-btn(
                  v-on:click="puzzleStore.currentSolverCommand === 'count-solutions' ? puzzleStore.cancelSolverOperation() : puzzleStore.countSolutions()"
                )
                  v-progress-circular.loading(
                    :indeterminate="true"
                    v-if="puzzleStore.currentSolverCommand === 'count-solutions'"
                  )
                  .label {{ puzzleStore.currentSolverCommand === 'count-solutions' ? 'Cancel' : 'Solution Count' }}
                v-btn(
                  v-on:click="puzzleStore.currentSolverCommand === 'logical-step' ? puzzleStore.cancelSolverOperation() : puzzleStore.logicalStep()"
                )
                  v-progress-circular.loading(
                    :indeterminate="true"
                    v-if="puzzleStore.currentSolverCommand === 'logical-step'"
                  )
                  .label {{ puzzleStore.currentSolverCommand === 'logical-step' ? 'Cancel' : 'Logical Step' }}
                .candidates
                  v-switch.auto-switch(
                    v-model="puzzleStore.autoTrueCandidates"
                    v-on:update:model-value="(val) => val ? puzzleStore.trueCandidates() : null"
                    :inset="true"
                    :hide-details="true"
                    density="compact"
                  )
                  v-btn(
                    v-on:click="puzzleStore.currentSolverCommand === 'true-candidates' ? puzzleStore.cancelSolverOperation() : puzzleStore.trueCandidates()"
                    :disabled="puzzleStore.autoTrueCandidates"
                    :color="puzzleStore.autoTrueCandidates ? 'blue-grey' : 'white'"
                  )
                    v-progress-circular.loading(
                      :indeterminate="true"
                      v-if="puzzleStore.currentSolverCommand === 'true-candidates'"
                    )
                    .label {{ puzzleStore.currentSolverCommand === 'true-candidates' ? 'Cancel' : 'Candidates' }}
                v-btn(
                  v-on:click="puzzleStore.currentSolverCommand === 'check-puzzle' ? puzzleStore.cancelSolverOperation() : puzzleStore.checkPuzzle()"
                )
                  v-progress-circular.loading(
                    :indeterminate="true"
                    v-if="puzzleStore.currentSolverCommand === 'check-puzzle'"
                  )
                  .label {{ puzzleStore.currentSolverCommand === 'check-puzzle' ? 'Cancel' : 'Check' }}
              .solver-read-out {{ puzzleStore.solverDisplay }}
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
    .solver-control-panel
      position absolute
      bottom 0
      left 0
      .panel-outer
        box-shadow none
        .panel-container
          background-color transparent
          :deep(.v-expansion-panel__shadow)
            display none
          :deep(.v-expansion-panel-text__wrapper)
            padding 0
          .solver-controls
            background-color #ddd
            padding 10px
            display flex
            flex-direction column
            gap 10px
            .actions
              display grid
              grid-template-columns 1fr 1fr
              gap 5px
              .loading
                margin-right 5px
                :deep(svg)
                  height 80%
                  width 80%
              .candidates
                display flex
                align-items center
                gap 5px
                .v-btn
                  flex 1
                .auto-switch
                  flex unset
                  min-height unset
                  :deep(.v-input__control)
                    justify-content center
                    .v-selection-control
                      flex unset
                      min-height unset
            .solver-read-out
              min-height 200px
              max-height 400px
              width 400px
              background-color #eee
              border 1px solid #bbb
              border-radius 10px
              white-space pre-wrap
              padding 5px 10px
              font-size 1.2rem

          .panel-toggle
            min-height unset
            width min-content
            padding 0
            display flex
            align-items center
            background-color none
            :deep(.v-expansion-panel-title__overlay)
              display none
            .label
              background-color #eee
              font-size 1.6rem
              height 35px
              display flex
              align-items center
              padding-left 15px
            .angle-container
              background-color #eee
              width 35px
              height 35px
              clip-path polygon(0 0, 0 0, 100% 100%, 0 100%)
            &:hover
              .label
              .angle-container
                background-color #ddd
</style>
