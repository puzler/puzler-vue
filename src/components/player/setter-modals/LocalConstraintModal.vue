<script setup lang="ts">
import { ref, computed } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter';
import { FaIcon } from '@/utils/font-awesome';

defineProps<{
  activator: HTMLElement
}>()

const puzzleStore = usePuzzleSetterStore()

const availableConstraints = computed(() => {
  const used = puzzleStore.puzzle.puzzleData.localConstraints
  const localGroups = {
    Lines: {
      'Renban Lines': !used.renbanLines,
      'Palindrome Lines': !used.palindromeLines,
      'German Whispers': !used.germanWhisperLines,
      'Dutch Whispers': !used.dutchWhisperLines,
      'Region Sums': !used.regionSumLines,
      'Between Lines': !used.betweenLines,
    },
    'Single Cell Constraints': {
      'Odd Cells': !used.oddCells,
      'Even Cells': !used.evenCells,
      Minimums: !used.minCells,
      Maximums: !used.maxCells,
      'Row Index Cells': !used.rowIndexCells,
      'Column Index Cells': !used.columnIndexCells,
    },
    'Cell Connectors': {
      'Difference Dots': !used.differenceDots,
      'Ratio Dots': !used.ratioDots,
      XV: !used.xv,
      Quadruples: !used.quadruples,
    },
    'Multi-Cell Constraints': {
      Thermometers: !used.thermometers,
      Arrows: !used.arrows,
      'Killer Cages': !used.killerCages,
      Clones: !used.clones,
      'Extra Regions': !used.extraRegions,
    },
    'Outer Clues': {
      'X-Sums': !used.xSums,
      'Sandwich Sums': !used.sandwichSums,
      Skyscrapers: !used.skyscrapers,
      'Little Killers': !used.littleKillerSums,
    },
  }

  return localGroups
})

const icons = {
  Thermometers: { type: 'v-icon', icon: 'mdi-thermometer' },
  Arrows: { type: 'v-icon', icon: 'mdi-arrow-decision-outline' },
  'Renban Lines': { type: 'v-icon', icon: 'mdi-chart-line-variant', color: 'rgb(240, 103, 240)' },
  'Palindrome Lines': { type: 'v-icon', icon: 'mdi-chart-line-variant', color: 'rgb(192, 192, 192)' },
  'German Whispers': { type: 'v-icon', icon: 'mdi-chart-line-variant', color: 'rgb(103, 240, 103)' },
  'Dutch Whispers': { type: 'v-icon', icon: 'mdi-chart-line-variant', color: 'rgb(255, 111, 0)' },
  'Region Sums': { type: 'v-icon', icon: 'mdi-chart-line-variant', color: 'rgb(0, 200, 255)' },
  'Between Lines': { type: 'v-icon', icon: 'mdi-circle-multiple-outline' },
  'Odd Cells': { type: 'v-icon', icon: 'mdi-circle', color: 'rgb(187, 187, 187)' },
  'Even Cells': { type: 'v-icon', icon: 'mdi-square', color: 'rgb(187, 187, 187)' },
  Minimums: { type: 'v-icon', icon: 'mdi-unfold-less-vertical' },
  Maximums: { type: 'v-icon', icon: 'mdi-unfold-more-vertical' },
  'Row Index Cells': { type: 'v-icon', icon: 'mdi-map-marker' },
  'Column Index Cells': { type: 'v-icon', icon: 'mdi-map-marker-outline' },
  'Difference Dots': { type: 'v-icon', icon: 'mdi-gamepad-circle-outline' },
  'Ratio Dots': { type: 'v-icon', icon: 'mdi-gamepad-circle' },
  XV: { type: 'v-icon', icon: 'mdi-alpha-v-circle' },
  Quadruples: { type: 'v-icon', icon: 'mdi-gamepad-circle-outline', rotate: 45 },
  'Killer Cages': { type: 'v-icon', icon: 'mdi-dots-square' },
  Clones: { type: 'v-icon', icon: 'mdi-checkbox-multiple-blank' },
  'Extra Regions': { type: 'v-icon', icon: 'mdi-texture-box' },
  'Sandwich Sums': { type: 'v-icon', icon: 'mdi-bread-slice' },
  Skyscrapers: { type: 'v-icon', icon: 'mdi-domain' },
  'X-Sums': { type: 'v-icon', icon: 'mdi-numeric-9-plus'},
  'Little Killers': { type: 'v-icon', icon: 'mdi-arrow-bottom-right-thick' }
}

const modalOpen = ref(false)

function sendAddElement(constraint: string) {
  puzzleStore.addElementToPuzzle(constraint)
  modalOpen.value = false
}

const openPanel = ref('Lines')
</script>

<template lang="pug">
v-dialog(
  :activator="activator"
  v-model="modalOpen"
)
  .modal-container
    v-expansion-panels(
      v-model="openPanel"
      variant="accordion"
      :mandatory="true"
    )
      v-expansion-panel.group-panel(
        v-for="group in Object.keys(availableConstraints)"
        :key="group"
        :value="group"
      )
        v-expansion-panel-title(
          :hide-actions="true"
        ) {{ group }}
        v-expansion-panel-text
          .group-btns
            .local-btn-container(
              v-for="constraint in Object.keys(availableConstraints[group])"
              :key="constraint"
            )
              v-btn.local-button(
                v-on:click="sendAddElement(constraint)"
                :color="availableConstraints[group][constraint] ? 'black' : 'blue-grey'"
                :disabled="!availableConstraints[group][constraint]"
                :variant="availableConstraints[group][constraint] ? 'plain' : undefined"
              )
                .no-icon(v-if="icons[constraint] === undefined")
                .icon(v-else-if="icons[constraint].icon")
                  FaIcon(
                    v-if="icons[constraint].type === 'fa'"
                    :icon="['fas', icons[constraint].icon]"
                  )
                  v-icon(
                    v-else-if="icons[constraint].type === 'v-icon'"
                    :icon="icons[constraint].icon"
                    :color="icons[constraint].color"
                    :style="{ transform: 'rotate(' + (icons[constraint].rotate || 0) + 'deg)' }"
                  )
                .name {{ constraint }}
</template>

<style scoped lang="stylus">
.modal-container
  background-color var(--color-background-soft)
  border-radius 20px
  margin 0 auto
  width 550px

  .group-panel
    :deep(.v-expansion-panel-text__wrapper)
      padding 0
    :deep(.v-expansion-panel-title)
      min-height unset
    .group-btns
      padding 0 0 10px
      max-height 200px
      overflow-y auto
      display grid
      grid-template-columns 1fr 1fr
      align-items center
      justify-content center
      .local-btn-container
        padding 10px
        display flex
        justify-content start
        .local-button
          justify-content start
          width 100%
          .icons
            display flex
          .icon
            font-size 1.7em
            margin-right 10px
</style>
