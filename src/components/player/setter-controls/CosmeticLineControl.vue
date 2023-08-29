<script setup lang="ts">
import { computed, ref } from 'vue'
import { CosmeticLineController } from '@/types/setting-mode-controllers'
import usePuzzleSetterStore from '@/stores/puzzle-setter';
import type { Color } from '@/graphql/generated/types';

const puzzleStore = usePuzzleSetterStore()

const controller = computed(() => puzzleStore.modeController as CosmeticLineController)
controller.value.addListener(refreshFormValues)

const formValues = ref({
    color: colorToColorPicker(controller.value.lineForm.color),
    width: controller.value.lineForm.width * 100,
})

function refreshFormValues() {
  formValues.value = {
    color: colorToColorPicker(controller.value.lineForm.color),
    width: controller.value.lineForm.width * 100,
  }
}

function colorToColorPicker({ red, green, blue, opacity }: Color): Record<string, any> {
  return { r: red, g: green, b: blue, a: opacity }
}

function colorPickerToColor({ r, g, b, a }: Record<string, any>): Color {
  return { red: r, green: g, blue: b, opacity: a }
}

function saveColor(field: 'color') {
  if (formValues.value[field]) {
    controller.value.input({
      field,
      value: colorPickerToColor(formValues.value[field]),
    })
  }
}

function nudgeNumber(field: 'width', amount: number) {
  const form = formValues.value as Record<string, any>
  if (form[field] !== undefined) {
    form[field] = parseInt(form[field]) // Make sure form field is a number
    
    const offset = Math.abs(form[field] % Math.abs(amount))
    if (amount > 0) {
      form[field] -= offset
    } else if (offset > 0) {
      form[field] += (Math.abs(amount) - offset)
    }

    form[field] += amount
    if (form[field] < 0) form[field] = 0

    controller.value.input({
      field,
      value: form[field] / 100.0,
    })
  }
}

function saveNumber(field: 'width') {
  const form = formValues.value as Record<string, any>
  if (form[field] !== undefined) {
    const rawVal = form[field]
    if (typeof rawVal === 'string') {
      form[field] = parseFloat(rawVal)
    } else {
      form[field] = rawVal
    }

    if (!Number.isFinite(form[field])) {
      form[field] = 0
    }

    if (form[field] < 0) {
      form[field] = 0
    }

    controller.value.input({
      field,
      value: form[field] / 100.0
    })
  }
}

function colorPickerToRGBA({ r, g, b, a }: Record<string, any>): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function selectAll(event: MouseEvent) {
  const target = event.target as HTMLInputElement
  target.select()
}
</script>

<template lang="pug">
.cosmetic-text-control
  .form-input
    .field Thickness
    .input
      v-btn.nudge-btn.left(
        v-on:click="nudgeNumber('width', -5)"
      )
        v-icon(icon="mdi-chevron-left")
      .manual-input
        .input-expander
          v-text-field(
            v-model="formValues.width"
            v-on:click:control="selectAll"
            v-on:keypress.enter="saveNumber('width')"
            v-on:update:focused="(focused) => focused ? null : saveNumber('width')"
            :hide-details="true"
            variant="plain"
          )
          .hidden-value {{ formValues.width }}
        .super %
      v-btn.nudge-btn.right(
        v-on:click="nudgeNumber('width', 5)"
      )
        v-icon(icon="mdi-chevron-right")
  v-expansion-panels.color-panels
    v-expansion-panel
      v-expansion-panel-title(:hide-actions="true")
        .color-panel-title
          .field Line Color
          .swatch(:style="{ backgroundColor: colorPickerToRGBA(formValues.color) }")
      v-expansion-panel-text
        v-color-picker(
          v-model="formValues.color"
          v-on:update:modelValue="saveColor('color')"
          :width="260"
        )
</template>

<style scoped lang="stylus">
.cosmetic-text-control
  .form-input
    display flex
    align-items center
    justify-content space-between
    margin 10px 5px 10px 20px
    .input
      display flex
      align-items center
      gap 2px
      .text-input
        width 90px
        .v-input
          width 100%
          flex unset
          :deep(.v-field__input)
            min-height unset
            padding 0
            width 100%
            input
              font-size 1.3rem
              text-align center
              margin 0
              line-height 1.3rem
    .manual-input
      display flex
      align-items center
      justify-content center
      min-width 50px
      .input-expander
        overflow-y hidden
        width min-content
        display flex
        flex-direction column
        .v-input
          flex unset
          width 100%
          :deep(.v-field__input)
            min-height unset
            padding 0
            width 100%
            input
              font-size 1.3rem
              text-align center
              margin 0
              line-height 1.3rem
        .hidden-value
          font-size 1.3rem
          height 0
      .super
        line-height 0
        margin-bottom 5px
    .nudge-btn
      min-height unset
      height unset
      min-width unset
      padding 0
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
</style>
