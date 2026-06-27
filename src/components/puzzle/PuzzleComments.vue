<script setup lang="ts">
import CommentComposer from './CommentComposer.vue'
import PuzzleCommentList from './PuzzleCommentList.vue'
import type { PuzzleDescriptionFieldsFragment } from '@/graphql/generated/types'

defineProps<{ puzzle: PuzzleDescriptionFieldsFragment }>()
const emit = defineEmits<{ posted: [] }>()
</script>

<template>
  <section>
    <h2 class="text-[11px] font-semibold uppercase tracking-widest text-soft mb-3">
      Comments
    </h2>
    <CommentComposer
      class="mb-5"
      :puzzle-id="puzzle.id"
      :gated="puzzle.commentsRequireSolveEffective"
      :viewer-has-solved="puzzle.viewerHasSolved"
      @posted="emit('posted')"
    />
    <PuzzleCommentList :comments="puzzle.comments" />
  </section>
</template>
