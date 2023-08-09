<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template lang="pug">
.auth-view
  RouterView
</template>

<style scoped lang="stylus">
.auth-view
  width 90%
  max-width 500px
  border 1px solid rgba(200, 200, 200, 0.5)
  padding 30px
  border-radius 10px
  margin 20px
  box-shadow 0 0 10px 0 rgb(200, 200, 200)


</style>
