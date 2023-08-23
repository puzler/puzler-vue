<script setup lang="ts">
import { ref, computed } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'

defineProps<{
  activator: HTMLElement
}>()

const puzzleStore = usePuzzleSetterStore()

const availableGlobals = computed(() => {
  const globals = [] as Array<string>
  const {
    diagonals,
    chess,
  } = puzzleStore.puzzle.puzzleData.globalConstraints

  if (!diagonals) globals.push('Diagonals')
  if (!chess) globals.push('Chess')

  return globals
})

const icons = {
  Diagonals: 'mdi-square-off-outline',
  Chess: 'fa:fas fa-chess-king'
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
      v-for="global in availableGlobals"
      :key="global"
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
