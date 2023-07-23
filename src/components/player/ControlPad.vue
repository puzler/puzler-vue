<script setup lang="ts">
import { computed } from 'vue'
import { Controller, ControllerMode } from '../../types'
const props = defineProps<{
  controller: Controller
}>();
const emit = defineEmits(['numpad-click', 'action-click'])

const modes = computed(() => {
  return Object.keys(ControllerMode).filter(
    (key) => !/^\d+$/.test(key)
  )
})

const numpad = computed(() => {
  const pad = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [0, 'delete'],
  ] as Array<Array<number|string>>

  if (props.controller.activeMode === ControllerMode.color) {
    pad[3] = [
      0,
      'editColors',
      'delete',
    ]
  }

  return pad
})

function handleClick(clickTarget: string|number) {
  if (typeof clickTarget === 'string') {
    emit('action-click', clickTarget)
  } else {
    emit('numpad-click', clickTarget)
  }
}

const actionIcons = {
  delete: ['fas', 'delete-left'],
  editColors: ['fas', 'palette'],
}
</script>

<template lang="pug">
.control-pad
  .mode-selectors(
    v-on:pointerdown.stop
  )
    v-btn.mode-selector-btn(
      v-for="mode in modes"
      :ripple="false"
      v-on:click="controller.mode = ControllerMode[mode]"
      :active="controller.activeMode === ControllerMode[mode]"
      :class="{ 'bg-blue-grey': controller.activeMode === ControllerMode[mode] }"
    )
      .mode {{ mode }}
  .numpad
    .row(
      v-for="row in numpad"
    )
      v-btn.numpad-btn(
        v-for="digit in row"
        v-on:click="handleClick(digit)"
        v-on:pointerdown.stop
      )
        .btn-content-container
          fa.action-btn(
            v-if="typeof digit === 'string'"
            :icon="actionIcons[digit]"
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
.control-pad
  display flex
  flex-direction column
  justify-content end
  gap 4px
  max-width 275px
  width 21cqw
  height 100cqh
  max-height calc(79cqw - 20px)
  container-type inline-size

  .mode-selectors
    display flex
    gap 4px
    touch-action none
    .mode-selector-btn
      height calc(25cqmin - 3px)
      width calc(25cqmin - 3px)
      padding 0 5cqmin
      min-width unset
      .mode
        font-size 4cqmin
  .numpad
    display flex
    flex-direction column
    gap 4px
    .row
      display flex
      gap 4px
      justify-content space-between
      .numpad-btn
        min-width unset
        padding 4cqmin
        height calc(33cqmin - 2px)
        width calc(33cqmin - 2px)
        container-type inline-size
        .btn-content-container
          preview-size = 92cqmin
          height preview-size
          width preview-size
          container-type size
          .action-btn
            height 60cqmin
            width 60cqmin
            padding 20cqmin
          .cell-preview
            height 100cqmin
            width 100cqmin
            border 0.5px solid #b2b2b2
            border-radius 4px
            &.number-input
              display flex
              align-items center
              justify-content center
              &.digit
                font-size 75cqmin
              &.center
                font-size 40cqmin
              &.corner
                padding 3px
                line-height 1
                font-size 35cqmin
                align-items start
                justify-content start

@media screen and (max-width: 900px)
  .control-pad
    container-type size
    flex-direction row
    height 40cqh
    width 100cqw
    max-width calc(60cqh - 20px)
    justify-content center
    gap 10px
    .mode-selectors
      flex-direction column
    .numpad
      padding-right calc(10px + (25cqmin - 3px))
      .row
        .numpad-btn
          height calc(25cqh - 3px)
          width calc(25cqh - 3px)
</style>
