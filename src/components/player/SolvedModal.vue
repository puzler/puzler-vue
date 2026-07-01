<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'
import RatePuzzleControl from '@/components/puzzle/RatePuzzleControl.vue'

interface RatingContext {
  puzzleId: string | null
  canRate: boolean
  stars: number | null
  difficulty: number | null
}

defineProps<{
  title: string
  solveMessage: string | null
  // Collection context for "next puzzle" / "back to collection" navigation.
  inCollection: boolean
  hasNext: boolean
  collectionTitle: string
  // Rating context: the section is shown only to logged-in solvers who aren't the
  // author; prefilled from any prior vote.
  rating: RatingContext
}>()

defineEmits<{ close: []; next: []; back: [] }>()
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

    <RatePuzzleControl
      v-if="rating.canRate && rating.puzzleId"
      class="w-full mt-2 pt-3 border-t border-line"
      :puzzle-id="rating.puzzleId"
      :stars="rating.stars"
      :difficulty="rating.difficulty"
    />

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
