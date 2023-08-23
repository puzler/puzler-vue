<script setup lang="ts">
import { ref, computed } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter';

defineProps<{
  activator: HTMLElement
}>()

const puzzleStore = usePuzzleSetterStore()

const availableConstraints = computed(() => {
  const constraints = [] as Array<string>
  const { 
    thermometers,
    arrows,
  } = puzzleStore.puzzle.puzzleData.localConstraints

  if (!thermometers) constraints.push('Thermometers')
  if (!arrows) constraints.push('Arrows')

  return constraints
})

const icons = {
  Thermometers: 'mdi-thermometer',
  Arrows: 'fa:fas fa-arrows-split-up-and-left',
}

const modalOpen = ref(false)

function sendAddElement(constraint: string) {
  puzzleStore.addElementToPuzzle(constraint)
  puzzleStore.setMode(constraint)
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
      v-for="constraint in availableConstraints"
      :key="constraint"
      v-on:click="sendAddElement(constraint)"
      :prepend-icon="icons[constraint]"
    ) {{ constraint }}
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
