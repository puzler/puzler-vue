<script setup lang="ts">
import usePuzzleSetterStore from '@/stores/puzzle-setter'

const puzzleStore = usePuzzleSetterStore()

const numpad = [
  1, 2, 3,
  4, 5, 6,
  7, 8, 9,
  0, null, 'delete',
]

const icons = {
  delete: 'mdi-backspace',
}

function sendInput(digit: number|'delete') {
  puzzleStore.modeController.input(digit)
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
      .digit(v-if="typeof digit === 'number'") {{ digit }}
      .action(v-else-if="typeof digit === 'string'")
        v-icon(:icon="icons[digit]")
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
