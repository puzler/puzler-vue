<script setup lang="ts">
import { computed, ref } from 'vue'
import { CosmeticTextController } from '@/types/setting-mode-controllers'
import usePuzzleSetterStore from '@/stores/puzzle-setter';
import type { Color } from '@/graphql/generated/types';

const puzzleStore = usePuzzleSetterStore()

const controller = computed(() => puzzleStore.modeController as CosmeticTextController)
controller.value.addListener(refreshFormValues)

const formValues = ref({
  fontColor: colorToColorPicker(controller.value.textForm.fontColor),
  size: controller.value.textForm.size * 100,
  angle: controller.value.textForm.angle || 0,
  address: (() => {
    if (!controller.value.inputTarget) return null
    return {
      row: controller.value.inputTarget.address.row + 1,
      column: controller.value.inputTarget.address.column + 1,
    }
  })(),
})

function refreshFormValues() {
  formValues.value = {
    fontColor: colorToColorPicker(controller.value.textForm.fontColor),
    size: controller.value.textForm.size * 100,
    angle: controller.value.textForm.angle || 0,
    address: (() => {
      if (!controller.value.inputTarget) return null
      return {
        row: controller.value.inputTarget.address.row + 1,
        column: controller.value.inputTarget.address.column + 1,
      }
    })(),
  }
}

function colorToColorPicker({ red, green, blue, opacity }: Color): Record<string, any> {
  return { r: red, g: green, b: blue, a: opacity }
}

function colorPickerToColor({ r, g, b, a }: Record<string, any>): Color {
  return { red: r, green: g, blue: b, opacity: a }
}

function saveColor(field: 'fontColor') {
  if (formValues.value[field]) {
    controller.value.input({
      field,
      value: colorPickerToColor(formValues.value[field]),
    })
  }
}

function nudgeNumber(field: 'size'|'angle', amount: number, type = 'percent') {
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
    if (type === 'percent' && form[field] < 0) form[field] = 0

    controller.value.input({
      field,
      value: form[field] / (type === 'percent' ? 100.0 : 1),
    })
  }
}

function saveNumber(field: 'size'|'angle') {
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

    if (field !== 'angle' && form[field] < 0) {
      form[field] = 0
    }

    controller.value.input({
      field,
      value: form[field] / (field === 'angle' ? 1 : 100.0)
    })
  }
}

function colorPickerToRGBA({ r, g, b, a }: Record<string, any>): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function nudgeAddress(field: 'row'|'column', nudgeAmount: number) {
  if (formValues.value.address) {
    let offset = Math.abs(formValues.value.address[field] % Math.abs(nudgeAmount))
    offset = Math.round(offset * 1000) / 1000.0
    if (nudgeAmount > 0) {
      formValues.value.address[field] -= offset
    } else if (offset > 0) {
      formValues.value.address[field] += (Math.abs(nudgeAmount) - offset)
    }
  
    formValues.value.address[field] += nudgeAmount
    controller.value.input({
      field: 'address',
      value: { [field]: formValues.value.address[field] - 1 }
    })
  }
}

function selectAll(event: MouseEvent) {
  const target = event.target as HTMLInputElement
  target.select()
}
</script>

<template lang="pug">
.cosmetic-text-control
  .form-input(v-if="controller.inputTarget")
    .field Text
    .input
      .text-input
        v-text-field(
          v-model="controller.inputTarget.text"
          :hide-details="true"
          variant="plain"
          placeholder="Empty"
        )
  .form-input
    .field Size
    .input
      v-btn.nudge-btn.left(
        v-on:click="nudgeNumber('size', -5)"
      )
        v-icon(icon="mdi-chevron-left")
      .manual-input
        .input-expander
          v-text-field(
            v-model="formValues.size"
            v-on:click:control="selectAll"
            v-on:keypress.enter="saveNumber('size')"
            v-on:update:focused="(focused) => focused ? null : saveNumber('size')"
            :hide-details="true"
            variant="plain"
          )
          .hidden-value {{ formValues.size }}
        span %
      v-btn.nudge-btn.right(
        v-on:click="nudgeNumber('size', 5)"
      )
        v-icon(icon="mdi-chevron-right")
  .form-input
    .field Rotation
    .input
      v-btn.nudge-btn.left(
        v-on:click="nudgeNumber('angle', -45, 'degrees')"
      )
        v-icon(icon="mdi-chevron-left")
      .manual-input
        .input-expander
          v-text-field(
            v-model="formValues.angle"
            v-on:click:control="selectAll"
            v-on:keypress.enter="saveNumber('angle')"
            v-on:update:focused="(focused) => focused ? null : saveNumber('angle')"
            :hide-details="true"
            variant="plain"
          )
          .hidden-value {{ formValues.angle }}
        .super °
      v-btn.nudge-btn.right(
        v-on:click="nudgeNumber('angle', 45, 'degrees')"
      )
        v-icon(icon="mdi-chevron-right")
  v-expansion-panels.color-panels
    v-expansion-panel
      v-expansion-panel-title(:hide-actions="true")
        .color-panel-title
          .field Font Color
          .swatch(:style="{ backgroundColor: colorPickerToRGBA(formValues.fontColor) }")
      v-expansion-panel-text
        v-color-picker(
          v-model="formValues.fontColor"
          v-on:update:modelValue="saveColor('fontColor')"
          :width="260"
        )
  .position-adjust(v-if="controller.inputTarget")
    .display
      .address-part Row {{ formValues.address.row }}
      .address-part Column {{ formValues.address.column }}
    .nudge-buttons
      .button-container
        v-btn.nudge-button.up(
          v-on:click="nudgeAddress('row', -0.5)"
        )
          v-icon.nudge-icon(icon="mdi-chevron-up")
        v-btn.nudge-button.right(
          v-on:click="nudgeAddress('column', 0.5)"
        )
          v-icon.nudge-icon(icon="mdi-chevron-right")
        v-btn.nudge-button.left(
          v-on:click="nudgeAddress('column', -0.5)"
        )
          v-icon.nudge-icon(icon="mdi-chevron-left")
        v-btn.nudge-button.down(
          v-on:click="nudgeAddress('row', 0.5)"
        )
          v-icon.nudge-icon(icon="mdi-chevron-down")
</template>

<style scoped lang="stylus">
.cosmetic-text-control
  .position-adjust
    padding 10px 5px 10px 20px
    display flex
    align-items center
    justify-content space-between
    gap 10px
    .display
      display flex
      flex 1
      flex-direction column
      gap 10px
      .address-part
        font-size 1.3rem
        line-height 1.3rem
    .nudge-buttons
      display flex
      align-items center
      justify-content end
      padding 13px
      .button-container
        transform rotate(45deg)
        display grid
        grid-template-columns 1fr 1fr
        grid-template-rows 1fr 1fr
        gap 2px
        .nudge-button
          width 30px
          min-width 0
          height 30px
          padding 0
          --outerCornerRadius 10px
          .nudge-icon
            transform rotate(-45deg)
            font-size 1.6rem
          &.up
            border-top-left-radius var(--outerCornerRadius)
          &.left
            border-bottom-left-radius var(--outerCornerRadius)
          &.down
            border-bottom-right-radius var(--outerCornerRadius)
          &.right
            border-top-right-radius var(--outerCornerRadius)
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
