<script setup lang="ts">
import { computed } from 'vue'
import { Controller, ControllerMode, Timer } from '@/types'
import useColorStore from '@/stores/color'
import TimerControls from './TimerControls.vue'

const props = defineProps<{
  controller: Controller
  timer: Timer
}>();
const emit = defineEmits(['numpad-click', 'action-click'])

const colorStore = useColorStore()
const colorPalette = colorStore.palette
const colorPage = computed(() => colorPalette.pages[props.controller.colorPageIndex])

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

function setMode(mode: ControllerMode) {
  if (props.controller.mode === ControllerMode.color && mode === ControllerMode.color) {
    emit('action-click', 'cycleColorPage')
  }

  emit('action-click', 'setControllerMode', { mode })
}

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
  checkSolution: 'mdi-check',
  editSettings: 'mdi-cog',
}

const actionBtns = [
  {
    action: 'checkSolution',
    tooltip: 'Answer Check',
  },
  {
    action: 'editSettings',
    tooltip: 'Settings',
  }
]
</script>

<template lang="pug">
.control-pad
  .top
    .action-btns
      v-btn.action-btn(
        v-for="btn in actionBtns"
        :key="btn"
        v-on:click="emit('action-click', btn.action)"
        color="blue-grey"
      )
        v-icon(
          :icon="actionIcons[btn.action]"
          :size="25"
        )
    TimerControls(:timer="timer")
  .spacer
  .bottom
    .mode-selectors
      v-btn.mode-selector-btn(
        v-for="mode in modes"
        :key="'mode-btn-' + mode"
        :ripple="false"
        v-on:pointerdown.stop="setMode(ControllerMode[mode])"
        :active="controller.activeMode === ControllerMode[mode]"
        :color="controller.activeMode === ControllerMode[mode] ? 'blue-grey' : 'light'"
      )
        .mode-btn-content
          .mode {{ mode }}
          .page-indicators(
            v-if="mode === ControllerMode[ControllerMode.color] && controller.activeMode === ControllerMode[mode]"
          )
            .indicator(
              v-for="i in colorPalette.pages.length"
              :key="'color-page-indicator-' + i"
              :class="{ active: controller.colorPageIndex === i - 1 }"
            )
    .numpad
      .row(
        v-for="row, i in numpad"
        :key="'numpad-row-' + i"
      )
        v-btn.numpad-btn(
          v-for="digit in row"
          :key="'numpad-btn-' + digit"
          :ripple="false"
          v-on:pointerdown.stop="handleClick(digit)"
        )
          .btn-content-container
            faIcon.action-btn(
              v-if="typeof digit === 'string'"
              :icon="actionIcons[digit]"
            )
            .cell-preview.color-swatch(
              v-else-if="controller.activeMode === ControllerMode.color"
              :style="{ backgroundColor: colorPalette.colors[colorPage[digit]] }"
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
  justify-content space-between
  gap 4px
  max-width 275px
  width 21cqw
  height 100cqh
  max-height calc(79cqw - 20px)
  container-type inline-size

  .top
    display flex
    justify-content space-between
    .action-btns
      display flex
      flex-direction column
      align-items start
      gap 2px
      button.action-btn
        min-width unset
        height unset
        padding 5px
        border-radius 15%

  .bottom
    display flex
    flex-direction column
    gap 5px
    .mode-selectors
      display flex
      gap 4px
      touch-action none
      .mode-selector-btn
        height calc(25cqmin - 3px)
        width calc(25cqmin - 3px)
        padding 0 5cqmin
        min-width unset
        .mode-btn-content
          display flex
          flex-direction column
          justify-content center
          gap 2px
          font-size 4cqmin
          .page-indicators
            display flex
            justify-content center
            position absolute
            bottom 10%
            left 0
            right 0
            gap 5px
            .indicator
              height 5px
              width 5px
              background-color #dddddd
              border-radius 50%
              &.active
                background-color #333333
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
          --btn-padding 4cqmin
          padding var(--btn-padding)
          --btn-size calc(33cqmin - 2px)
          --btn-content-size calc(25cqmin - 2px)
          height var(--btn-size)
          width var(--btn-size)
          .btn-content-container
            --preview-size calc(var(--btn-content-size) * 0.98)
            height var(--preview-size)
            width var(--preview-size)
            .action-btn
              height calc(var(--btn-content-size) * 0.6)
              width calc(var(--btn-content-size) * 0.6)
              padding calc(var(--btn-content-size) / 5)
            .cell-preview
              height var(--btn-content-size)
              width var(--btn-content-size)
              border 0.5px solid #b2b2b2
              border-radius 4px
              &.number-input
                display flex
                align-items center
                justify-content center
                &.digit
                  font-size calc(var(--btn-content-size) * 0.75)
                &.center
                  font-size calc(var(--btn-content-size) * 0.4)
                &.corner
                  padding 3px
                  line-height 1
                  font-size calc(var(--btn-content-size) * 0.35)
                  align-items start
                  justify-content start

@media screen and (max-width: 900px)
  .control-pad
    height 40cqh
    width 100cqw
    max-width calc(60cqh - 20px)
    justify-content center
    gap 5px
    container-type size
    flex-direction row-reverse

    .top
      flex-direction column-reverse
      width calc(25cqmin - 3px)
      .action-btns
        flex-direction column
    .bottom
      flex-direction row
      .mode-selectors
        flex-direction column
      .spacer
        flex 0
      .numpad
        .row
          .numpad-btn
            --btn-size calc(25cqh - 3px)
            --btn-content-size calc((25cqh - var(--btn-padding) - var(--btn-padding) - 3px))
</style>
