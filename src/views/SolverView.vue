<script setup lang="ts">
import { useRoute } from 'vue-router'
import Grid from '../components/grid/Grid.vue'

const fPuzzle = useRoute().query.fPuzzle
</script>

<template lang="pug">
Grid(
  :base64String="props.fPuzzle"
)
</template>

<style scoped lang="stylus">
</style>
