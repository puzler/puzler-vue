<script setup lang="ts">
import useSettingStore from '@/stores/setting'

defineProps<{
  activator: Element
}>()

const settingStore = useSettingStore()
const settings = settingStore.userSettings
</script>

<template lang="pug">
v-dialog(
  :activator="activator"
  v-on:update:model-value="(opening) => { if (!opening) { settingStore.saveSettings() } }"
)
  .modal-container
    .settings
      .setting
        .label Highlight Conflicts
        v-switch(
          inset
          v-model="settings.highlightConflicts"
          :color="settings.highlightConflicts ? 'green' : 'light'"
          :hide-details="true"
          density="compact"
        )
      .setting
        .label Highlight Pencilmark Conflicts
        v-switch(
          inset
          v-model="settings.highlightPencilMarkConflicts"
          :color="settings.highlightPencilMarkConflicts ? 'green' : 'light'"
          :hide-details="true"
          density="compact"
        )
      .setting
        .label Check Solution on Finish
        v-switch(
          inset
          v-model="settings.checkOnFinish"
          :color="settings.checkOnFinish ? 'green' : 'light'"
          :hide-details="true"
          density="compact"
        )
</template>

<style scoped lang="stylus">
.modal-container
  background-color var(--color-background-soft)
  border-radius 2%
  padding 20px
  display flex-direction
  flex-direction column
  gap 20px
  width fit-content
  margin 0 auto
  .settings
    display flex
    flex-direction column
    gap 10px
    .setting
      display flex
      align-items center
      justify-content start
      gap 10px
</style>
