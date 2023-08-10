<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeaderNav from './HeaderNav.vue'
import AppFooter from './AppFooter.vue'
</script>

<template lang="pug">
.app-container
  HeaderNav
  .main-content
    RouterView
  AppFooter
</template>

<style scoped lang="stylus">
.app-container
  display flex
  flex-direction column
  height 100vh
  width 100vw

  .main-content
    flex-grow 1
    display flex
    flex-direction column
    align-items center
    container-type size
    container-name main-content
</style>
