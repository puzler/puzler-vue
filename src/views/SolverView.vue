<script setup lang="ts">
import { useRoute } from 'vue-router'
import Player from '../components/player/Player.vue'

const fPuzzle = useRoute().query.fPuzzle
</script>

<template lang="pug">
Player(
  :base64String="fPuzzle"
)
</template>

<style scoped lang="stylus">
</style>
