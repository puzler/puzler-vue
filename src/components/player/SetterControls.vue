<script setup lang="ts">
import { ref, computed } from 'vue'

import GlobalConstraintModal from './setter-modals/GlobalConstraintModal.vue';
import LocalConstraintModal from './setter-modals/LocalConstraintModal.vue'

import useAuthStore from '@/stores/auth';
import usePuzzleSetterStore from '@/stores/puzzle-setter';

const authStore = useAuthStore()
const puzzleStore = usePuzzleSetterStore()

const authorPlaceholder = computed(() => {
  return authStore.currentUser?.displayName || 'Unknown Author'
})

const modalActivators = ref({
  globalConstraint: document.createElement('btn'),
  localConstraint: document.createElement('btn'),
})

const modeController = computed(() => puzzleStore.modeController)
const controllerVue = computed(() => modeController.value?.controllerVue)

const includedCosmetics = computed(() => {
  const cosmetics = [] as Array<string>
  const {
    circles,
    rectangles,
    lines,
    text,
    cages,
  } = puzzleStore.puzzle.puzzleData.cosmetics

  if (circles) cosmetics.push('Circles')
  if (rectangles) cosmetics.push('Rectangles')
  if (lines) cosmetics.push('Lines')
  if (text) cosmetics.push('Text')
  if (cages) cosmetics.push('Cages')

  return cosmetics
})

const includedGlobals = computed(() => {
  const globals = [] as Array<string>
  const {
    diagonals,
    chess,
  } = puzzleStore.puzzle.puzzleData.globalConstraints

  if (diagonals) globals.push('Diagonals')
  if (chess) globals.push('Chess')

  return globals
})

const includedConstraints = computed(() => {
  const constraints = [] as Array<string>
  const {
    killerCages,
    arrows,
    clones,
    thermometers,
    betweenLines,
    extraRegions,
    littleKillerSums,
    sandwichSums,
    quadruples,
  } = puzzleStore.puzzle.puzzleData.localConstraints

  if (killerCages) constraints.push('Cages')
  if (arrows) constraints.push('Arrows')
  if (clones) constraints.push('Clones')
  if (thermometers) constraints.push('Thermometers')
  if (betweenLines) constraints.push('Between Lines')
  if (extraRegions) constraints.push('Extra Regions')
  if (littleKillerSums) constraints.push('Little Killers')
  if (sandwichSums) constraints.push('Sandwich')
  if (quadruples) constraints.push('Quadruples')

  return constraints
})
</script>

<template lang="pug">
.setter-control-panel
  GlobalConstraintModal(
    :activator="modalActivators.globalConstraint"
  )
  LocalConstraintModal(
    :activator="modalActivators.localConstraint"
  )
  .meta-controls
    v-text-field.text-control.puzzle-title(
      name="title"
      v-model="puzzleStore.puzzle.puzzleData.title"
      variant="plain"
      placeholder="Untitled Puzzle"
      :hide-details="true"
      density="compact"
    )
    v-text-field.text-control.author(
      :class="{ 'dark-placeholder': authStore.authenticated }"
      name="author"
      v-model="puzzleStore.puzzle.puzzleData.author"
      variant="plain"
      :placeholder="authorPlaceholder"
      :hide-details="true"
      density="compact"
    )
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
    //- .global-group.anti-kropki(
    //-   v-if="includedGlobals.includes('Anti-Kropki')"
    //- )
    //-   v-btn.remove(
    //-     v-on:click="puzzleStore.removeElementFromPuzzle('Chess')"
    //-     variant="plain"
    //-     color="red"
    //-   )
    //-     v-icon(icon="mdi-close")
    //-   .title Chess:
    //-   v-btn.knight(
    //-     v-on:click=""
    //-   )
    //- .global-group.anti-xv(
    //-   v-if="includedGlobals.includes('Anti-XV')"
    //- )
    //-   v-btn.remove(
    //-     v-on:click="puzzleStore.removeElementFromPuzzle('Chess')"
    //-     variant="plain"
    //-     color="red"
    //-   )
    //-     v-icon(icon="mdi-close")
    //-   .title Chess:
    //-   v-btn.knight(
    //-     v-on:click=""
    //-   )
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
      .header-text Constraints
    .local-group.no-remove
      v-btn.control-selector(
        v-on:click="puzzleStore.setMode('Given')"
        :color="puzzleStore.settingMode === 'Given' ? 'blue-grey' : 'white'"
      ) Given Digits
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
      )
      .header-text Cosmetics
    .control-selector(
      v-for="cosmeticType in includedCosmetics"
      :key="cosmeticType"
    ) {{ cosmeticType }}
  .spacer
  component.controller-vue(
    :is="controllerVue"
  )
</template>

<style scoped lang="stylus">
.setter-control-panel
  width 300px
  background-color #eee
  height 100cqh
  display flex
  flex-direction column
  padding 20px

  .spacer
    flex 1

  .meta-controls
    .text-control
      :deep(.v-field__input)
        min-height unset
        padding 0
        input
          margin 0
      &.puzzle-title
        :deep(input)
          font-size 2em

  .control-group
    display flex
    flex-direction column
    align-items start
    margin-top 20px
    .header
      display flex
      gap 10px
      align-items center
      margin-bottom 10px
      .header-text
        font-size 1.5rem
        line-height 0
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
    &.constraints
      .local-group
        margin 3px 0
        display flex
        align-items center
        gap 10px
        &.no-remove
          margin-left 38px
        .remove
          min-width unset
          padding 5px
        .control-selector
          margin 0
</style>
