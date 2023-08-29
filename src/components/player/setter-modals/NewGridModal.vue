<script setup lang="ts">
import { ref } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'

defineProps<{
  activator: HTMLElement
}>()

const puzzleStore = usePuzzleSetterStore()

const modalOpen = ref(false)

const gridSize = ref(9)

function adjustSize(adjustment: number) {
  gridSize.value += adjustment
  if (gridSize.value < 3) gridSize.value = 3
  if (gridSize.value > 20) gridSize.value = 20
}

function sendNewGrid() {
  puzzleStore.newPuzzle(gridSize.value)
  modalOpen.value = false
}
</script>

<template lang="pug">
v-dialog(
  :activator="activator"
  v-model="modalOpen"
)
  .modal-container
    .warning
      .line This will erase the current grid and replace it with a new one.
      .line Make sure you save first!
    .size-selector
      v-btn(
        :disabled="gridSize <= 3"
        v-on:click="adjustSize(-1)"
      )
        v-icon(icon="mdi-chevron-left")
      .size {{ gridSize }}x{{ gridSize }} Grid
      v-btn(
        :disabled="gridSize >= 20"
        v-on:click="adjustSize(1)"
      )
        v-icon(icon="mdi-chevron-right")
    v-btn.submit(
      v-on:click="sendNewGrid"
    ) Submit
</template>

<style scoped lang="stylus">
.modal-container
  background-color var(--color-background-soft)
  border-radius 2%
  padding 20px
  display flex
  flex-direction column
  gap 20px
  width fit-content
  margin 0 auto
  .warning
    display flex
    flex-direction column
    align-items center
    font-size 1.3rem
  .size-selector
    display flex
    align-items center
    justify-content center
    gap 20px
    padding 20px 0
    .size
      font-size 3rem
      line-height 3rem
      width 250px
      text-align center
    .v-btn
      padding 5px
      height unset
      min-width unset
      font-size 1.8rem
</style>
