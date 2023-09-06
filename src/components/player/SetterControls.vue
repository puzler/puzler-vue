<script setup lang="ts">
import { computed } from 'vue'

import GlobalConstraintModal from './setter-modals/GlobalConstraintModal.vue'
import LocalConstraintModal from './setter-modals/LocalConstraintModal.vue'
import CosmeticModal from './setter-modals/CosmeticModal.vue'
import PuzzleRulesModal from './setter-modals/PuzzleRulesModal.vue'

import useAuthStore from '@/stores/auth';
import usePuzzleSetterStore from '@/stores/puzzle-setter';

defineProps<{
  hide: boolean
}>()

const authStore = useAuthStore()
const puzzleStore = usePuzzleSetterStore()

const authorPlaceholder = computed(() => {
  return authStore.currentUser?.displayName || 'Unknown Author'
})

const modalActivators = {
  globalConstraint: document.createElement('button'),
  localConstraint: document.createElement('button'),
  cosmetics: document.createElement('button'),
  rules: document.createElement('button')
}

const modeController = computed(() => puzzleStore.modeController)
const modeControllerVue = computed(() => {
  if (modeController.value?.controllerVue) {
    return modeController.value.controllerVue()
  }
  return undefined
})

const includedCosmetics = computed(() => {
  const cosmetics = [] as Array<string>
  const used = puzzleStore.puzzle.puzzleData.cosmetics

  if (used.circles) cosmetics.push('Circles')
  if (used.rectangles) cosmetics.push('Rectangles')
  if (used.lines) cosmetics.push('Lines')
  if (used.text) cosmetics.push('Text')
  if (used.cages) cosmetics.push('Cages')
  if (used.cellBackgroundColors) cosmetics.push('Cell Colors')

  return cosmetics
})

const includedGlobals = computed(() => {
  const globals = [] as Array<string>
  const used = puzzleStore.puzzle.puzzleData.globalConstraints

  if (used.diagonals) globals.push('Diagonals')
  if (used.chess) globals.push('Chess')
  if (used.antiKropki) globals.push('Anti-Kropki')
  if (used.antiXV) globals.push('Anti-XV')
  if (used.disjointSets) globals.push('Disjoint Sets')

  return globals
})

const includedConstraints = computed(() => {
  return Object.keys(puzzleStore.puzzle.puzzleData.localConstraints).map(
    (key) => puzzleStore.constraintNameMap[key]
  )
})
</script>

<template lang="pug">
.setter-control-panel(:class="{ hide }")
  GlobalConstraintModal(:activator="modalActivators.globalConstraint")
  LocalConstraintModal(:activator="modalActivators.localConstraint")
  CosmeticModal(:activator="modalActivators.cosmetics")
  PuzzleRulesModal(:activator="modalActivators.rules")
  v-expansion-panels(variant="accordion")
    v-expansion-panel.solver-panel
      v-expansion-panel-title.panel-title(:hide-actions="true")
        .panel-label
          .panel-name Solver
          v-icon.panel-icon(icon="mdi-desktop-classic")
      v-expansion-panel-text.solver-panel-contents
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
              v-btn.auto-toggle(
                v-on:click="puzzleStore.toggleAutoTrueCandidates"
                :active="puzzleStore.autoTrueCandidates"
                :color="puzzleStore.autoTrueCandidates ? 'blue-grey' : 'black'"
                :variant="puzzleStore.autoTrueCandidates ? 'flat' : 'plain'"
              )
                v-icon(icon="mdi-sync")
              v-btn(
                v-on:click="puzzleStore.currentSolverCommand === 'true-candidates' ? puzzleStore.cancelSolverOperation() : puzzleStore.trueCandidates()"
                :disabled="puzzleStore.autoTrueCandidates"
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
          .show-candidates-count
            v-checkbox(
              v-model="puzzleStore.countCandidates"
              v-on:update:model-value="() => puzzleStore.autoTrueCandidates ? puzzleStore.trueCandidates() : null"
              label="Show Candidates Count"
              color="blue-grey"
              density="compact"
              :hide-details="true"
            )
          .solver-read-out
            .read-out-line(
              v-for="line, i in puzzleStore.solverDisplay"
              :key="`${i} - ${line}`"
            ) {{ line }}
  .meta-controls
    v-btn.rule-editor-btn(
      v-on:click="modalActivators.rules.click()"
    )
      v-icon(icon="mdi-clipboard-list")
    .meta-fields
      v-text-field.text-control.puzzle-title(
        name="title"
        v-model="puzzleStore.puzzle.puzzleData.title"
        variant="plain"
        placeholder="Untitled Puzzle"
        :hide-details="true"
        density="compact"
        v-on:keydown.stop
      )
      v-text-field.text-control.author(
        :class="{ 'dark-placeholder': authStore.authenticated }"
        name="author"
        v-model="puzzleStore.puzzle.puzzleData.author"
        variant="plain"
        :placeholder="authorPlaceholder"
        :hide-details="true"
        density="compact"
        v-on:keydown.stop
      )
  .grid-controls
    v-btn.control-selector(
      v-on:click="puzzleStore.setMode('Given')"
      :color="puzzleStore.settingMode === 'Given' ? 'blue-grey' : 'white'"
      density="compact"
      :ripple="false"
    ) Given Digits
    v-btn.control-selector(
      v-on:click="puzzleStore.setMode('Regions')"
      :color="puzzleStore.settingMode === 'Regions' ? 'blue-grey' : 'white'"
      density="compact"
      :ripple="false"
    ) Region Editor
  .puzzle-editor
    .control-group.globals
      .header
        v-btn(
          icon="mdi-plus"
          density="compact"
          v-on:click="modalActivators.globalConstraint.click()"
        )
        .header-text Global Constraints
      .global-group.chess(
        v-if="includedGlobals.includes('Chess')"
      )
        v-btn.remove(
          v-on:click="puzzleStore.removeElementFromPuzzle('Chess')"
          variant="plain"
          color="red"
        )
          v-icon(icon="mdi-close")
        .title Chess:
        v-btn.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.chess.knight = !puzzleStore.puzzle.puzzleData.globalConstraints.chess.knight"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.chess.knight"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.chess.knight ? 'blue-grey' : 'white'"
        )
          v-icon(icon="fa:fas fa-chess-knight")
        v-btn.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.chess.king = !puzzleStore.puzzle.puzzleData.globalConstraints.chess.king"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.chess.king"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.chess.king ? 'blue-grey' : 'white'"
        )
          v-icon(icon="fa:fas fa-chess-king")
      .global-group.anti-kropki(
        v-if="includedGlobals.includes('Anti-Kropki')"
      )
        v-btn.remove(
          v-on:click="puzzleStore.removeElementFromPuzzle('Anti-Kropki')"
          variant="plain"
          color="red"
        )
          v-icon(icon="mdi-close")
        .title Anti-Kropki:
        v-btn.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiWhite = !puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiWhite"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiWhite"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiWhite ? 'blue-grey' : 'white'"
        )
          v-icon(
            :icon="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiWhite ? 'mdi-circle' : 'mdi-circle-outline'"
            :color="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiWhite ? 'white' : 'black'"
          )
        v-btn.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiBlack = !puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiBlack"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiBlack"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.antiKropki.antiBlack ? 'blue-grey' : 'white'"
        )
          v-icon(icon="mdi-circle" color="black")
      .global-group.anti-xv(
        v-if="includedGlobals.includes('Anti-XV')"
      )
        v-btn.remove(
          v-on:click="puzzleStore.removeElementFromPuzzle('Anti-XV')"
          variant="plain"
          color="red"
        )
          v-icon(icon="mdi-close")
        .title Anti-XV:
        v-btn.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiX = !puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiX"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiX"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiX ? 'blue-grey' : 'white'"
        ) X
        v-btn.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiV = !puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiV"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiV"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.antiXV.antiV ? 'blue-grey' : 'white'"
        ) V
      .global-group.disjoint-sets(
        v-if="includedGlobals.includes('Disjoint Sets')"
      )
        v-btn.remove(
          v-on:click="puzzleStore.removeElementFromPuzzle('Disjoint Sets')"
          variant="plain"
          color="red"
        )
          v-icon(icon="mdi-close")
        .title Disjoint Sets:
        v-btn.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.disjointSets.enabled = !puzzleStore.puzzle.puzzleData.globalConstraints.disjointSets.enabled"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.disjointSets.enabled"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.disjointSets.enabled ? 'blue-grey' : 'white'"
        ) {{ puzzleStore.puzzle.puzzleData.globalConstraints.disjointSets.enabled ? 'ON' : 'OFF' }}
      .global-group.diagonals(
        v-if="includedGlobals.includes('Diagonals')"
      )
        v-btn.remove(
          v-on:click="puzzleStore.removeElementFromPuzzle('Diagonals')"
          variant="plain"
          color="red"
        )
          v-icon(icon="mdi-close")
        .title Diagonals:
        v-btn.negative.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.negative = !puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.negative"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.negative"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.negative ? 'blue-grey' : 'white'"
        )
          v-icon(icon="mdi-square-off-outline")
        v-btn.positive.global-toggle(
          v-on:click="puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.positive = !puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.positive"
          :active="puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.positive"
          density="compact"
          :color="puzzleStore.puzzle.puzzleData.globalConstraints.diagonals.positive ? 'blue-grey' : 'white'"
        )
          v-icon(
            icon="mdi-square-off-outline"
            :style="{ rotate: '-90deg' }"
          )
    .control-group.constraints
      .header
        v-btn(
          icon="mdi-plus"
          density="compact"
          v-on:click="modalActivators.localConstraint.click()"
        )
        .header-text Local Constraints
      .local-group(
        v-for="constraintType in includedConstraints"
        :key="constraintType"
      )
        v-btn.remove(
          v-on:click="puzzleStore.removeElementFromPuzzle(constraintType)"
          color="red"
          variant="plain"        
        )
          v-icon(icon="mdi-close")
        v-btn.control-selector(
          v-on:click="puzzleStore.setMode(constraintType)"
          :color="puzzleStore.settingMode === constraintType ? 'blue-grey' : 'white'"
        ) {{ constraintType }}
    .control-group.cosmetics
      .header
        v-btn(
          icon="mdi-plus"
          density="compact"
          v-on:click="modalActivators.cosmetics.click()"
        )
        .header-text Cosmetics
      .cosmetic-group(
        v-for="cosmeticType in includedCosmetics"
        :key="cosmeticType"
      )
        v-btn.remove(
          v-on:click="puzzleStore.removeElementFromPuzzle(cosmeticType)"
          color="red"
          variant="plain"        
        )
          v-icon(icon="mdi-close")
        v-btn.control-selector(
          v-on:click="puzzleStore.setMode(cosmeticType)"
          :color="puzzleStore.settingMode === cosmeticType ? 'blue-grey' : 'white'"
        ) {{ cosmeticType }}
    .spacer
    component.controller-vue(
      v-if="modeControllerVue !== undefined"
      :key="puzzleStore.settingMode"
      :is="modeControllerVue.component"
      v-bind="modeControllerVue.props"
    )
</template>

<style scoped lang="stylus">
.setter-control-panel
  --panel-width 300px
  width var(--panel-width)
  background-color #eee
  height 100cqh
  display flex
  flex-direction column
  overflow-y auto
  transition width 0.5s ease-in-out

  &.hide
    width 0

  .solver-panel
    .panel-title
      padding 5px 15px
      min-height unset
      .panel-label
        width 100%
        display flex
        align-items center
        justify-content space-between
        .panel-name
          font-size 1.2rem
    .solver-panel-contents
      :deep(.v-expansion-panel-text__wrapper)
        padding 0
      .solver-controls
        display flex
        flex-direction column
        gap 5px
        padding 5px 10px 10px
        .actions
          display grid
          grid-template-columns 1fr 1fr
          gap 5px
          .v-btn
            padding 0
            flex 1
            .label
              font-size 0.8rem
          .loading
            margin-right 5px
            :deep(svg)
              height 80%
              width 80%
          .candidates
            display flex
            align-items center
            gap 5px
            .auto-toggle
              flex unset
              min-width unset
              height unset
              padding 4px
              :deep(.v-input__control)
                justify-content center
                .v-selection-control
                  flex unset
                  min-height unset
        .show-candidates-count
          :deep(.v-checkbox .v-selection-control)
            min-height unset
        .solver-read-out
          height 200px
          overflow-y auto
          background-color #eee
          border 1px solid #bbb
          border-radius 10px
          white-space pre-wrap
          padding 5px 10px
          font-size 1.2rem
          scrollbar-color transparent
          &::-webkit-scrollbar
            background transparent
            width 15px
            margin 2px
          &::-webkit-scrollbar-thumb
            background #bbb
            border-radius 20px
            border 5px solid #eee
          .read-out-line
            margin 10px 0
            line-height 1.5rem
            &:first-child
              margin-top 0
            &:last-child
              margin-bottom 0

  .meta-controls
    display flex
    padding 10px
    margin-top 5px
    gap 10px
    .rule-editor-btn
      min-width unset
      height unset
      flex 0 1
      padding 5px
    .meta-fields
      flex 1
      .text-control
        :deep(.v-field__input)
          min-height unset
          padding 0
          input
            margin 0
        &.puzzle-title
          :deep(input)
            font-size 2em
  .grid-controls
    width var(--panel-width)
    display grid
    grid-template-columns 1fr 1fr
    .v-btn
      border-radius 0
      box-shadow none
      --v-btn-height 40px
  .puzzle-editor
    flex 1
    display flex
    flex-direction column
    padding 10px 20px 0
    .spacer
      flex 1
    .control-group
      display flex
      flex-direction column
      align-items start
      margin-top 10px
      .header
        display flex
        gap 10px
        align-items center
        margin-bottom 10px
        .header-text
          font-size 1.3rem
          line-height 0
          white-space nowrap
        .v-btn
          --v-btn-size 0.9rem
          --v-btn-height 30px
      .control-selector
        margin 10px 30px
        min-height unset
        height unset
        padding 5px 10px
      &.globals
        .global-group
          margin 0
          display flex
          align-items center
          gap 10px
          .title
            font-size 1.2rem
          .remove
            min-width unset
            padding 5px
          .global-toggle
            min-width unset
            padding 4px
            height unset
      .cosmetic-group
      .local-group
        display flex
        align-items center
        margin-left 5px
        gap 10px
        &.no-remove
          margin-left 38px
        .remove
          min-width unset
          padding 5px
        .control-selector
          margin 0
</style>
