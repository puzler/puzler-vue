<script setup lang="ts">
import { useRoute } from 'vue-router'
import PuzzlePlayer from '../components/player/PuzzlePlayer.vue'

const fPuzzle = useRoute().query.fPuzzle
</script>

<template lang="pug">
PuzzlePlayer(
  :base64String="fPuzzle"
)
</template>

<style scoped lang="stylus">
</style>
