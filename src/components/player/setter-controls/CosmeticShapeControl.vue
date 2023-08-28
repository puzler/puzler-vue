<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ColorInput } from '@/graphql/generated/types'
import usePuzzleSetterStore from '@/stores/puzzle-setter'
import { CosmeticShapeController } from '@/types/setting-mode-controllers'

const puzzleStore = usePuzzleSetterStore()

const controller = computed(() => {
  return puzzleStore.modeController as CosmeticShapeController
})

controller.value.addListener(refreshFormValues)
const controllerForm = computed(() => controller.value.shapeForm)

function refreshFormValues() {
  formValues.value = {
    address: {
      row: controllerForm.value.address.row + 1,
      column: controllerForm.value.address.column + 1,
    },
    textColor: colorToColorPicker(
      controllerForm.value.textColor || { red: 0, blue: 0, green: 0, opacity: 1 },
    ),
    fillColor: colorToColorPicker(
      controllerForm.value.fillColor || { red: 255, blue: 255, green: 255, opacity: 1 }
    ),
    outlineColor: colorToColorPicker(
      controllerForm.value.outlineColor || { red: 0, blue: 0, green: 0, opacity: 1 },
    ),
    height: controllerForm.value.height * 100,
    width: controllerForm.value.width * 100,
    angle: controllerForm.value.angle,
    text: controllerForm.value.text,
  }
}

const formValues = ref({
  address: {
    row: controllerForm.value.address.row + 1,
    column: controllerForm.value.address.column + 1,
  },
  textColor: colorToColorPicker(
    controllerForm.value.textColor || { red: 0, blue: 0, green: 0, opacity: 1 },
  ),
  fillColor: colorToColorPicker(
    controllerForm.value.fillColor || { red: 255, blue: 255, green: 255, opacity: 1 }
  ),
  outlineColor: colorToColorPicker(
    controllerForm.value.outlineColor || { red: 0, blue: 0, green: 0, opacity: 1 },
  ),
  height: controllerForm.value.height * 100,
  width: controllerForm.value.width * 100,
  angle: controllerForm.value.angle,
  text: controllerForm.value.text,
})

function colorToColorPicker({ red, green, blue, opacity}: ColorInput) {
  return {
    r: red,
    g: green,
    b: blue,
    a: opacity,
  }
}

function colorPickerToColor({ r, g, b, a }: Record<string, number>) {
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

function updateControllerColor(field: 'textColor'|'outlineColor'|'fillColor') {
  controller.value.input({
    field,
    value: colorPickerToColor(formValues.value[field])
  })
}

function nudgeNumber(field: string, nudgeAmount: number, type = 'percent' as 'percent'|'degrees') {
  const form = formValues.value as Record<string, any>
  if (form[field] !== undefined) {
    form[field] = parseInt(form[field]) // Make sure form field is a number
    
    const offset = Math.abs(form[field] % Math.abs(nudgeAmount))
    if (nudgeAmount > 0) {
      form[field] -= offset
    } else if (offset > 0) {
      form[field] += (Math.abs(nudgeAmount) - offset)
    }

    form[field] += nudgeAmount
    if (type === 'percent' && form[field] < 0) form[field] = 0

    controller.value.input({
      field,
      value: form[field] / (type === 'percent' ? 100.0 : 1),
    })
  }
}

function saveNumber(field: 'height'|'width'|'angle') {
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

function nudgeAddress(field: 'row'|'column', nudgeAmount: number) {
  let offset = Math.abs(formValues.value.address[field] & Math.abs(nudgeAmount))
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

function saveAddressChange(field: 'row'|'column') {
  const current = formValues.value.address[field] as any 
  if (typeof current === 'string') {
    formValues.value.address[field] = parseFloat(current)
    if (!Number.isFinite(formValues.value.address[field])) {
      formValues.value.address[field] = 1
    }
  }

  controller.value.input({ field: 'address', value: { [field]: formValues.value.address[field] - 1 } })
}

function selectAll(event: MouseEvent) {
  const target = event.target as HTMLInputElement
  target.select()
}

const panel = ref('form')

function forcePanel(newVal?: string) {
  if (newVal === undefined) {
    panel.value = 'form'
  }
}
</script>

<template lang="pug">
.cosmetic-shape-control
  v-expansion-panels(
    v-model="panel"
    v-on:update:model-value="forcePanel"
    variant="accordion"
  )
    v-expansion-panel.clear-panel(value="form")
      v-expansion-panel-text.clear-panel-text
        .shape-form
          .form-input
            .field Text
            .input
              .text-input
                v-text-field(
                  v-model="formValues.text"
                  v-on:update:model-value="(value) => controller.input({ field: 'text', value })"
                  :hide-details="true"
                  variant="plain"
                  placeholder="Empty"
                )
          .form-input
            .field Height
            .input
              v-btn.nudge-btn.left(
                v-on:click="nudgeNumber('height', -5)"
              )
                v-icon(icon="mdi-chevron-left")
              .manual-input
                .input-expander
                  v-text-field(
                    v-model="formValues.height"
                    v-on:click:control="selectAll"
                    v-on:keypress.enter="saveNumber('height')"
                    v-on:update:focused="(focused) => focused ? null : saveNumber('height')"
                    :hide-details="true"
                    variant="plain"
                  )
                  .hidden-value {{ formValues.height }}
                span %
              v-btn.nudge-btn.right(
                v-on:click="nudgeNumber('height', 5)"
              )
                v-icon(icon="mdi-chevron-right")
          .form-input
            .field Width
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
                span %
              v-btn.nudge-btn.right(
                v-on:click="nudgeNumber('width', 5)"
              )
                v-icon(icon="mdi-chevron-right")
          .form-input
            .field Rotation
            .input
              v-btn.nudge-btn.left(
                v-on:click="nudgeNumber('angle', -45, true)"
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
                v-on:click="nudgeNumber('angle', 45, true)"
              )
                v-icon(icon="mdi-chevron-right")
          v-expansion-panels.color-panels(variant="accordion")
            v-expansion-panel
              v-expansion-panel-title(:hide-actions="true")
                .color-panel-title
                  .field Fill Color
                  .swatch(:style="{ backgroundColor: colorPickerToRGBA(formValues.fillColor) }")
              v-expansion-panel-text
                v-color-picker(
                  v-model="formValues.fillColor"
                  v-on:update:modelValue="updateControllerColor('fillColor')"
                  :width="260"
                )
            v-expansion-panel
              v-expansion-panel-title(:hide-actions="true")
                .color-panel-title
                  .field Outline Color
                  .swatch(:style="{ backgroundColor: colorPickerToRGBA(formValues.outlineColor) }")
              v-expansion-panel-text
                v-color-picker(
                  v-model="formValues.outlineColor"
                  v-on:update:modelValue="updateControllerColor('outlineColor')"
                  :width="260"
                )
            v-expansion-panel
              v-expansion-panel-title(:hide-actions="true")
                .color-panel-title
                  .field Text Color
                  .swatch(:style="{ backgroundColor: colorPickerToRGBA(formValues.textColor) }")
              v-expansion-panel-text
                v-color-picker(
                  v-model="formValues.textColor"
                  v-on:update:modelValue="updateControllerColor('textColor')"
                  :width="260"
                )
          .position-adjust(v-if="true || controller.inputTarget")
            .display
              .address-input
                .field Row
                .manual-input
                  v-text-field(
                    v-model="formValues.address.row"
                    v-on:click:control="selectAll"
                    v-on:update:focused="(focused) => focused ? null : saveAddressChange('row')"
                    v-on:keydown.enter="saveAddressChange('row')"
                    :hide-details="true"
                    variant="plain"
                  )
              .address-input
                .field Col
                .manual-input
                  v-text-field(
                    v-model="formValues.address.column"
                    v-on:click:control="selectAll"
                    v-on:update:focused="(focused) => focused ? null : saveAddressChange('column')"
                    v-on:keydown.enter="saveAddressChange('column')"
                    :hide-details="true"
                    variant="plain"
                  )
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
    v-expansion-panel.clear-panel(value="list")
      v-expansion-panel-title.compact-panel-title(
        expand-icon="mdi-chevron-up"
        collapse-icon="mdi-chevron-down"
      ) List
      v-expansion-panel-text.clear-panel-text
        .item-list
          v-btn.item(
            v-for="item, i in controller.items"
            :key="i"
            v-on:click="controller.selectItem(i)"
            v-on:mouseenter="controller.bounceItem(i)"
            variant="plain"
          )
            v-btn.remove-item(
              variant="plain"
              color="red"
              v-on:click.stop="controller.removeItem(i)"
            )
              v-icon(icon="mdi-close")
            .item-address
              .row R {{ item.address.row + 1 }}
              .column C {{ item.address.column + 1 }}
          .no-items(
            v-if="controller.items.length === 0"
          ) There aren't any {{ controller.shapeType }} yet!
</template>

<style scoped lang="stylus">
.clear-panel
  background-color transparent
  > :deep(.v-expansion-panel__shadow)
    display none
  .clear-panel-text
    :deep(.v-expansion-panel-text__wrapper)
      padding 0
  &::after
    opacity 0
  .compact-panel-title
    border-radius 10px
    min-height unset
    :deep(.v-expansion-panel-title__overlay)
      display none
    @css {
      background-color: rgb(var(--v-theme-surface));
    }
.clear-css
  padding 0
.item-list
  height 300px
  overflow-y auto
  padding 20px
  display grid
  grid-template-columns 2fr 2fr
  gap 10px
  .item
    padding 0
    justify-content space-evenly
    .remove-item
      min-width unset
      padding 5px
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
    .address-input
      display grid
      grid-template-columns 1fr 2fr
      gap 10px
      align-items center
      .field
        font-size 1.3rem
        line-height 1.3rem
      .manual-input
        flex 1
        .v-input
          width 100%
          flex unset
          :deep(.v-field__input)
            min-height unset
            padding 0
            width 100%
            input
              font-size 1.3rem
              margin 0
              line-height 1.3rem
  .nudge-buttons
    display flex
    align-items center
    justify-content end
    padding 13px
    .button-container
      transform rotate(45deg)
      display grid
      flex-direction column
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
        &.right
          border-top-right-radius var(--outerCornerRadius)
        &.down
          border-bottom-right-radius var(--outerCornerRadius)
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
