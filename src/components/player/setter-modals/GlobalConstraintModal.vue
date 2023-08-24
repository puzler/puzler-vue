<script setup lang="ts">
import { ref, computed } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'

defineProps<{
  activator: HTMLElement
}>()

const puzzleStore = usePuzzleSetterStore()

const availableGlobals = computed(() => {
  const globals = puzzleStore.puzzle.puzzleData.globalConstraints

  return {
    Diagonals: !globals.diagonals,
    Chess: !globals.chess,
    'Anti-Kropki': !globals.antiKropki,
    'Anti-XV': !globals.antiXV,
    'Disjoint Sets': !globals.disjointSets,
  }
})

const icons = {
  Diagonals: 'mdi-square-off-outline',
  Chess: 'fa:fas fa-chess-king',
  'Anti-Kropki': 'mdi-circle-off-outline',
  'Anti-XV': 'mdi-close-outline',
  'Disjoint Sets': 'mdi-dots-square',
}

const modalOpen = ref(false)

function sendAddElement(global: string) {
  puzzleStore.addElementToPuzzle(global)
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
      v-for="global in Object.keys(availableGlobals)"
      :key="global"
      :color="!availableGlobals[global] ? 'blue-grey' : 'white'"
      :disabled="!availableGlobals[global]"
      v-on:click="sendAddElement(global)"
      :prepend-icon="icons[global]"
    ) {{ global }}
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
