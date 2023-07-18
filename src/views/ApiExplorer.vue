<script setup lang="ts">
import HeaderNav from './layout/HeaderNav.vue';
const explorerUrl = `${import.meta.env.VITE_PUZLER_API_ROOT}/explorer`;
</script>

<template lang="pug">
.app-container
  HeaderNav
  iframe.explorer-frame(
    :src="explorerUrl"
    frameborder="0"
  )
</template>

<style scoped lang="stylus">
.app-container
  display flex
  flex-direction column
  height 100vh
  width 100vw

  .explorer-frame
    flex 1
</style>