<script setup lang="ts">
import type { Color } from '@/graphql/generated/types'
import usePuzzleSetterStore from '@/stores/puzzle-setter'
import { CosmeticCageController } from '@/types/setting-mode-controllers'
import { ref } from 'vue'
import { computed } from 'vue'

const puzzleStore = usePuzzleSetterStore()

const actionTypes = ['delete']
const icons = {
  delete: 'mdi-backspace',
}

const numpad = [
  1, 2, 3,
  4, 5, 6,
  7, 8, 9,
  0, null, 'delete',
]

const controller = computed(() => puzzleStore.modeController as CosmeticCageController)
controller.value.addListener(refreshFormValues)

const controllerForm = computed(() => controller.value.cageForm)
const defaultColor = { red: 0, blue: 0, green: 0, opacity: 1 }

function refreshFormValues() {
  formValues.value = {
    textColor: colorToColorPicker(
      controllerForm.value.textColor || defaultColor
    ),
    cageColor: colorToColorPicker(
      controllerForm.value.cageColor || defaultColor
    ),
  }
}

const formValues = ref({
  textColor: colorToColorPicker(
    controllerForm.value.textColor || defaultColor
  ),
  cageColor: colorToColorPicker(
    controllerForm.value.cageColor || defaultColor
  ),
})

function colorToColorPicker({ red, green, blue, opacity }: Color) {
  return { r: red, g: green, b: blue, a: opacity }
}

function colorPickerToColor({ r, g, b, a }: Record<string, number>): Color {
  return {
    red: r,
    green: g,
    blue: b,
    opacity: a,
  }
}

function colorPickerToRGBA({ r, g, b, a }: Record<string, number>) {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function updateControllerColor(field: 'textColor'|'cageColor') {
  controller.value.input({
    field,
    value: colorPickerToColor(formValues.value[field])
  })
}

function sendNumpadInput(digit: number|'delete') {
  'delete'.toString()
  puzzleStore.modeController.input({ field: 'text', value: digit.toString() })
}
</script>

<template lang="pug">
.cosmetic-cage-control
  v-expansion-panels.color-panels(variant="accordion")
    v-expansion-panel
      v-expansion-panel-title.color-panel-title(:hide-actions="true")
        .color-panel-title
          .field Text Color
          .swatch(:style="{ backgroundColor: colorPickerToRGBA(formValues.textColor) }")
      v-expansion-panel-text
        v-color-picker(
          v-model="formValues.textColor"
          v-on:update:model-value="updateControllerColor('textColor')"
          :width="260"
        )
    v-expansion-panel
      v-expansion-panel-title(:hide-actions="true")
        .color-panel-title
          .field Cage Color
          .swatch(:style="{ backgroundColor: colorPickerToRGBA(formValues.cageColor) }")
      v-expansion-panel-text
        v-color-picker(
          v-model="formValues.cageColor"
          v-on:update:model-value="updateControllerColor('cageColor')"
          :width="260"
        )
  .numpad-control
    .numpad-btn-container(
      v-for="digit in numpad"
      :key="`numpad-btn-${digit}`"
    )
      .blank(v-if="digit === null")
      v-btn.numpad-btn(
        v-else
        v-on:click="sendNumpadInput(digit)"
      )
        .action(v-if="actionTypes.includes(digit)")
          v-icon(:icon="icons[digit]")
        .digit(v-else) {{ digit }}
</template>

<style scoped lang="stylus">
.cosmetic-cage-control
  display flex
  flex-direction column
  gap 10px
  .color-panels
    .color-panel-title
      display flex
      justify-content space-between
      width 100%
      align-items center
      .swatch
        border 1px solid #ccc
        border-radius 8px
        padding 14px 25px
    :deep(.v-expansion-panel-title__overlay)
      display none
    :deep(.v-expansion-panel-title)
      height unset
      min-height unset
      padding 10px 20px
    :deep(.v-expansion-panel-text__wrapper)
      padding 0
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
