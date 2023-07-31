<script setup lang="ts">
import { ref, computed } from 'vue';
import { Timer } from '@/types/timer';
import { onBeforeUnmount } from 'vue';

const props = defineProps<{
  timer: Timer
}>()

const icons = {
  pause: 'mdi-pause',
  play: 'mdi-play',
}

const displayTime = ref(props.timer.readableOutput)
const refreshInterval = ref(null as null|NodeJS.Timeout);
const toggleIcon = computed(() => props.timer.paused ? icons.play : icons.pause)

refreshDisplay()
onBeforeUnmount(() => {
  if (refreshInterval.value !== null) {
    clearTimeout(refreshInterval.value)
    refreshInterval.value = null
  }
})

function refreshDisplay() {
  displayTime.value = props.timer.readableOutput
  refreshInterval.value = setTimeout(
    refreshDisplay,
    1000 - (props.timer.milliseconds % 1000),
  )
}

function toggleTimer() {
  if (props.timer.paused) {
    props.timer.play()
    refreshDisplay()
  } else {
    props.timer.pause()
    if (refreshInterval.value !== null) {
      clearTimeout(refreshInterval.value)
      refreshInterval.value = null
    }
  }
}
</script>

<template lang="pug">
.timer-container
  .timer-controls
    .toggle-btn(
      v-on:click="toggleTimer"
    )
      v-icon(:icon="toggleIcon")
    .timer-display {{ displayTime}}
</template>

<style scoped lang="stylus">
.timer-container
  display flex
  align-items start
  .timer-controls
    display flex
    align-items center
    gap 10px
    margin-bottom 10px

    .toggle-btn
      width 10cqw
      height 10cqw
      border-radius 50%
      border 2px solid
      display flex
      align-items center
      justify-content center
      padding 10px

    .timer-display
      font-size 10cqw
      line-height 0
</style>
