<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import PuzzleFetcher from '@/utils/puzzle-fetcher'
import type { Puzzle } from '@/graphql/generated/types'
import PuzzlePlayer from '@/components/player/PuzzlePlayer.vue'
import { onMounted } from 'vue'
import { PuzzleSolve } from '@/types'

const fPuzzle = useRoute().query.fPuzzle
const props = defineProps<{
  puzzleId?: string
}>()

const puzzle = ref(null as null|Puzzle)

onMounted(async () => {
  if (props.puzzleId) {
    puzzle.value = await PuzzleFetcher.fetchById(props.puzzleId)
  } else if (fPuzzle) {
    puzzle.value = await PuzzleFetcher.fetchFPuzzle(fPuzzle as string)
  } else {
    const temp = new PuzzleSolve({ size: 9 })
    puzzle.value = temp.puzzleData
  }
})

</script>

<template lang="pug">
PuzzlePlayer(
  v-if="puzzle !== null"
  :rawPuzzle="puzzle"
)
.loading(v-else) Loading...
</template>

<style scoped lang="stylus">
</style>
