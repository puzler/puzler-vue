<script setup lang="ts">
import { computed } from 'vue'
import { Controller, ControllerMode } from '../../types'
const props = defineProps<{
  controller: Controller
}>();
const emit = defineEmits(['numpad-click'])

const modes = computed(() => {
  return Object.keys(ControllerMode).filter(
    (key) => !/^\d+$/.test(key)
  )
})

const numpad = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
  [0, null],
]
</script>

<template lang="pug">
.control-pad(v-on:mousedown.stop)
  .mode-selector
    v-btn(
      v-for="mode in modes"
      v-on:click="controller.mode = ControllerMode[mode]"
      :variant="controller.activeMode === ControllerMode[mode] ? 'outlined' : 'flat'"
    ) {{ mode }}
  .numpad
    .row(
      v-for="row in numpad"
    )
      v-btn.numpad-btn(
        v-for="digit in row"
        v-on:click="emit('numpad-click', digit)"
      )
        .btn-content-container
          fa(
            :icon="['fas', 'delete-left']"
            v-if="digit === null"
          )
          .cell-preview.color-swatch(
            v-else-if="controller.activeMode === ControllerMode.color"
            :style="{ backgroundColor: controller.colorPage[digit].color }"
          )
          .cell-preview.number-input(
            v-else
            :class="ControllerMode[controller.activeMode]"
          ) {{ digit }}
</template>

<style scoped lang="stylus">
.numpad
  .row
    display flex
    .numpad-btn
      flex 1
      margin 2px
      padding 8px
      height auto
      container-type inline-size
      &:first
        margin-left 0
      &:last
        margin-right 0
      .btn-content-container
        preview-size = 50px
        height preview-size
        width preview-size
        container-type size
        .cell-preview
          height 100cqw
          width 100cqw
          border 0.5px solid #b2b2b2
          border-radius 4px
          &.number-input
            display flex
            align-items center
            justify-content center
            &.digit
              font-size 75cqw
            &.center
              font-size 40cqw
            &.corner
              padding 2px
              font-size 30cqw
              align-items start
              justify-content start
</style>