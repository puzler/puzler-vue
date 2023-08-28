<script setup lang="ts">
import { ref, computed } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'

defineProps<{
  activator: HTMLElement
}>()

const puzzleStore = usePuzzleSetterStore()

const availableCosmetics = computed(() => {
  const cosmetics = puzzleStore.puzzle.puzzleData.cosmetics

  return {
    Lines: !cosmetics.lines,
    Circles: !cosmetics.circles,
    Rectangles: !cosmetics.rectangles,
    Cages: !cosmetics.cages,
    Text: !cosmetics.text,
    'Cell Colors': !cosmetics.cellBackgroundColors,
  }
})

const icons = {
  Lines: 'mdi-chart-line-variant',
  Circles: 'mdi-circle',
  Rectangles: 'mdi-square',
  Cages: 'mdi-dots-square',
  Text: 'mdi-alphabetical-variant',
  'Cell Colors': 'mdi-palette',
}

const modalOpen = ref(false)

function sendAddElement(cosmetic: string) {
  puzzleStore.addElementToPuzzle(cosmetic)
  modalOpen.value = false
}
</script>

<template lang="pug">
v-dialog(
  :activator="activator"
  v-model="modalOpen"
)
  .modal-container
    v-btn(
      v-for="cosmetic in Object.keys(availableCosmetics)"
      :key="cosmetic"
      :color="!availableCosmetics[cosmetic] ? 'blue-grey' : 'white'"
      :disabled="!availableCosmetics[cosmetic]"
      v-on:click="sendAddElement(cosmetic)"
      :prepend-icon="icons[cosmetic]"
    ) {{ cosmetic }}
</template>

<style scoped lang="stylus">
.modal-container
  background-color var(--color-background-soft)
  border-radius 2%
  padding 20px
  display grid
  grid-template-columns 1fr 1fr
  gap 20px
  width fit-content
  margin 0 auto
</style>
