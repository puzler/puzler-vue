<script setup lang="ts">
import { ref, computed } from 'vue'

import GlobalConstraintModal from './setter-modals/GlobalConstraintModal.vue';
import LocalConstraintModal from './setter-modals/LocalConstraintModal.vue'
import CosmeticModal from './setter-modals/CosmeticModal.vue'

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
  cosmetics: document.createElement('btn'),
})

const modeController = computed(() => puzzleStore.modeController)
const modeControllerVue = computed(() => {
  if (modeController.value.controllerVue) {
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
.setter-control-panel
  GlobalConstraintModal(
    :activator="modalActivators.globalConstraint"
  )
  LocalConstraintModal(
    :activator="modalActivators.localConstraint"
  )
  CosmeticModal(
    :activator="modalActivators.cosmetics"
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
    :is="modeControllerVue.component"
    v-bind="modeControllerVue.props"
  )
</template>

<style scoped lang="stylus">
.setter-control-panel
  width 300px
  background-color #eee
  height 100cqh
  display flex
  flex-direction column
  overflow-y auto
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
          height unset
    .cosmetic-group
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
