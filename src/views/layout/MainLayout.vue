<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeaderNav from './HeaderNav.vue'
</script>

<template lang="pug">
.app-container
  HeaderNav
  .main-content
    RouterView
</template>

<style scoped lang="stylus">
.app-container
  display flex
  flex-direction column
  min-height 100vh

  .main-content
    max-width 1280px
    padding 0 20px
    margin 0 auto
    flex-grow 1
</style>