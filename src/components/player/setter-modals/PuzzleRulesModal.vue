<script setup lang="ts">
import { ref } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'

defineProps<{
  activator: HTMLElement
}>()

const puzzleStore = usePuzzleSetterStore()

const modalOpen = ref(false)

const tempRules = ref('')

function save() {
  puzzleStore.puzzle.puzzleData.rules = tempRules.value
  modalOpen.value = false
  puzzleStore.setMode(rememberMode.value)
  rememberMode.value = null
}

let rememberMode = ref(null as null|string)

function modalOpenedChanged() {
  tempRules.value = puzzleStore.puzzle.puzzleData.rules || ''
  if (modalOpen.value) {
    rememberMode.value = puzzleStore.settingMode
    puzzleStore.setMode(null)
  } else {
    puzzleStore.setMode(rememberMode.value)
    rememberMode.value = null
  }
}
</script>

<template lang="pug">
v-dialog(
  :activator="activator"
  v-model="modalOpen"
  v-on:update:model-value="modalOpenedChanged"
)
  .modal-container
    v-textarea.rules-textarea(
      placeholder="No rules given for this puzzle"
      v-model="tempRules"
      :hide-details="true"
      :no-resize="true"
      :height="400"
      :rows="8"
      variant="outlined"
    )
    v-btn.submit(
      v-on:click="save"
    ) Save
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
  .rules-textarea
    width 500px
    font-size 1.2rem
</style>
