<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import PuzzleFetcher from '@/utils/puzzle-fetcher'
import PuzzlePlayer from '@/components/player/PuzzlePlayer.vue'
import { onMounted } from 'vue'
import { PuzzleSolve } from '@/types'

const fPuzzle = useRoute().query.fPuzzle
const props = defineProps<{
  puzzleId?: string
}>()

const puzzle = ref(null as null|PuzzleSolve)

onMounted(async () => {
  if (props.puzzleId) {
    puzzle.value = new PuzzleSolve({
      puzzle: await PuzzleFetcher.fetchById(props.puzzleId),
      size: 9,
    })
  } else if (fPuzzle) {
    puzzle.value = new PuzzleSolve({
      puzzle: await PuzzleFetcher.fetchFPuzzle(fPuzzle as string),
      size: 9,
    })
  } else {
    puzzle.value = new PuzzleSolve({ size: 9 })
  }
})

</script>

<template lang="pug">
PuzzlePlayer(
  v-if="puzzle !== null"
  :puzzle="puzzle"
)
.loading(v-else) Loading...
</template>

<style scoped lang="stylus">
</style>
