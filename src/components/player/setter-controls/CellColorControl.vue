<script setup lang="ts">
import { computed, ref } from 'vue'
import usePuzzleSetterStore from '@/stores/puzzle-setter'
import { CellColorController } from '@/types/setting-mode-controllers'
import type { Color } from '@/graphql/generated/types';

function colorToColorPicker({ red, green, blue, opacity }: Color): Record<string, any> {
  return { r: red, g: green, b: blue, a: opacity }
}

function colorPickerToColor({ r, g, b, a }: Record<string, any>): Color {
  return { red: r, green: g, blue: b, opacity: a }
}

const puzzleStore = usePuzzleSetterStore()

const controller = computed(() => puzzleStore.modeController as CellColorController)
controller.value.addListener(refreshFormColor)

const formColor = ref(colorToColorPicker(controller.value.formColor))
function refreshFormColor() {
  formColor.value = colorToColorPicker(controller.value.formColor)
}

function updateController() {
  controller.value.formColor = colorPickerToColor(formColor.value)
}
</script>

<template lang="pug">
.cell-color-control
  v-color-picker(
    v-model="formColor"
    v-on:update:model-value="updateController"
    :width="260"
  )
</template>

<style scoped lang="stylus">
</style>
