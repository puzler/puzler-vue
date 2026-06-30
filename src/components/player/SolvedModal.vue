<script setup lang="ts">
import { ref, watch } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import BaseModal from '@/components/ui/BaseModal.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiStar, mdiStarOutline } from '@mdi/js'
import DifficultyPips from '@/components/DifficultyPips.vue'
import RatePuzzleDocument from '@/graphql/gql/social/mutations/RatePuzzle.graphql'
import type { RatePuzzleMutation, RatePuzzleMutationVariables } from '@/graphql/generated/types'

interface RatingContext {
  puzzleId: string | null
  canRate: boolean
  stars: number | null
  difficulty: number | null
}

const props = defineProps<{
  title: string
  solveMessage: string | null
  // Collection context for "next puzzle" / "back to collection" navigation.
  inCollection: boolean
  hasNext: boolean
  collectionTitle: string
  // Rating context: the section is shown only to logged-in solvers; prefilled
  // from any prior vote.
  rating: RatingContext
}>()

defineEmits<{ close: []; next: []; back: [] }>()

const stars = ref<number | null>(props.rating.stars)
const difficulty = ref<number | null>(props.rating.difficulty)
const saved = ref(false)

const STARS = [1, 2, 3, 4, 5]
function pickStars(value: number) {
  stars.value = stars.value === value ? null : value
}

// Upsert the rating whenever the solver changes either dimension.
watch([stars, difficulty], async () => {
  const puzzleId = props.rating.puzzleId
  if (!puzzleId) return
  await apolloClient.mutate<RatePuzzleMutation, RatePuzzleMutationVariables>({
    mutation: RatePuzzleDocument,
    variables: { puzzleId, stars: stars.value, difficultyVote: difficulty.value },
  })
  saved.value = true
})
</script>

<template>
  <BaseModal
    size="sm"
    card-class="p-8 items-center gap-3"
    @close="$emit('close')"
  >
    <span class="text-2xl">🎉</span>
    <span class="text-lg font-semibold text-ink-text">Solved!</span>
    <span
      class="text-sm text-center whitespace-pre-line"
      :class="solveMessage ? 'text-ink-text' : 'text-faint'"
    >{{ solveMessage || `Nicely done! You completed “${title}”.` }}</span>

    <div
      v-if="rating.canRate && rating.puzzleId"
      class="w-full mt-2 pt-3 border-t border-line flex flex-col items-center gap-2"
    >
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

    <button
      v-if="inCollection && hasNext"
      class="mt-2 px-4 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep"
      @click="$emit('next')"
    >
      Next puzzle →
    </button>
    <button
      v-else-if="inCollection"
      class="mt-2 px-4 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep"
      @click="$emit('back')"
    >
      Back to {{ collectionTitle || 'collection' }}
    </button>
    <button
      class="text-sm text-soft hover:text-ink-text"
      @click="$emit('close')"
    >
      Keep looking
    </button>
  </BaseModal>
</template>
