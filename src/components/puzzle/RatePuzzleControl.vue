<script setup lang="ts">
import { ref, watch } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiStar, mdiStarOutline } from '@mdi/js'
import DifficultyPips from '@/components/DifficultyPips.vue'
import RatePuzzleDocument from '@/graphql/gql/social/mutations/RatePuzzle.graphql'
import type { RatePuzzleMutation, RatePuzzleMutationVariables } from '@/graphql/generated/types'

// Editable stars + difficulty for the current viewer, upserting via RatePuzzle on
// change. Reused by the post-solve SolvedModal and the puzzle page (where a
// previously-solved viewer re-rates). Gating (solver, not author) is the caller's
// job here and enforced server-side.
const props = defineProps<{
  puzzleId: string | null
  stars: number | null
  difficulty: number | null
}>()

const stars = ref<number | null>(props.stars)
const difficulty = ref<number | null>(props.difficulty)
const saved = ref(false)

const STARS = [1, 2, 3, 4, 5]
function pickStars(value: number) {
  stars.value = stars.value === value ? null : value
}

// Upsert whenever the viewer changes either dimension.
watch([stars, difficulty], async () => {
  if (!props.puzzleId) return
  await apolloClient.mutate<RatePuzzleMutation, RatePuzzleMutationVariables>({
    mutation: RatePuzzleDocument,
    variables: { puzzleId: props.puzzleId, stars: stars.value, difficultyVote: difficulty.value },
  })
  saved.value = true
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <span class="text-xs font-semibold uppercase tracking-widest text-soft">
      {{ saved ? 'Thanks for rating!' : 'Rate this puzzle' }}
    </span>
    <div class="flex items-center gap-0.5">
      <button
        v-for="value in STARS"
        :key="value"
        type="button"
        class="text-amber-500 hover:scale-110 transition-transform"
        :title="`${value} star${value === 1 ? '' : 's'}`"
        @click="pickStars(value)"
      >
        <MdiIcon
          :path="stars && value <= stars ? mdiStar : mdiStarOutline"
          :size="20"
        />
      </button>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs text-soft">Difficulty</span>
      <DifficultyPips
        v-model="difficulty"
        :size="16"
      />
    </div>
  </div>
</template>
