<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template lang="pug">
footer
  RouterLink(
    to="/legal/privacy"
  ) Privacy Policy
  RouterLink(
    to="/legal/cookies"
  ) Cookie Policy
</template>

<style scoped lang="stylus">
footer
  padding 2px 10px
  display flex
  justify-content flex-end
  gap 10px
  font-size 10px
  background-color #eeeeee
</style>