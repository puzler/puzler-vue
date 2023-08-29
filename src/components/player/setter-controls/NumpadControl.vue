<script setup lang="ts">
import usePuzzleSetterStore from '@/stores/puzzle-setter'

const puzzleStore = usePuzzleSetterStore()

defineProps<{
  numpad: Array<number|null|string>
}>()

const actionTypes = ['delete']
const icons = {
  delete: 'mdi-backspace',
}

function sendInput(digit: number|'delete') {
  puzzleStore.modeController?.input(digit)
}
</script>

<template lang="pug">
.numpad-control
  .numpad-btn-container(
    v-for="digit in numpad"
    :key="`numpad-btn-${digit}`"
  )
    v-btn.numpad-btn(
      v-if="digit !== null"
      v-on:click="sendInput(digit)"
    )
      .action(v-if="actionTypes.includes(digit)")
        v-icon(:icon="icons[digit]")
      .digit(v-else) {{ digit }}
    .blank(v-else)
</template>

<style scoped lang="stylus">
.numpad-control
  display grid
  grid-template-columns 1fr 1fr 1fr
  gap 10px
  .numpad-btn
    width 100%
    padding 50%
    line-height 0
    font-size 3rem
    display flex
    align-items center
    justify-content center

    .action
      font-size 1.5rem
</style>
