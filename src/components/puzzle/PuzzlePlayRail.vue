<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import PuzzleThumbnail from '@/components/grid/PuzzleThumbnail.vue'
import PuzzlePlayLinks from '@/components/puzzle/PuzzlePlayLinks.vue'
import SolutionCodeBox from '@/components/puzzle/SolutionCodeBox.vue'
import RatePuzzleControl from '@/components/puzzle/RatePuzzleControl.vue'
import FavoriteButton from '@/components/puzzle/FavoriteButton.vue'
import PuzzleStatList from '@/components/puzzle/PuzzleStatList.vue'
import { useAuthStore } from '@/stores/auth'
import type { PuzzleDescriptionFieldsFragment } from '@/graphql/generated/types'
import type { SerializedPuzzle } from '@/utils/puzzleExport'

const auth = useAuthStore()

// The thumbnail + play CTAs card. On mobile the thumbnail is capped and the stat
// list is hidden (the banner already shows those numbers); on desktop it fills
// the rail and the full stat list appears.
defineProps<{
  puzzle: PuzzleDescriptionFieldsFragment
  playTo: RouteLocationRaw
  thumbnailDefinition: SerializedPuzzle | null
  isAuthor?: boolean
  shareToken?: string | null
}>()

defineEmits<{ manage: []; solved: []; favorited: [{ isFavorited: boolean; favoriteCount: number }] }>()
</script>

<template>
  <div class="bg-surface border border-line rounded-xl p-4 flex flex-col gap-4">
    <div
      v-if="thumbnailDefinition"
      class="w-full max-w-xs mx-auto lg:max-w-none"
    >
      <PuzzleThumbnail :definition="thumbnailDefinition" />
    </div>

    <PuzzlePlayLinks
      block
      :play-to="playTo"
      :sudokupad-url="puzzle.sudokupadUrl"
      :sudokupad-includes-solution="puzzle.sudokupadIncludesSolution"
    />

    <FavoriteButton
      v-if="auth.isAuthenticated"
      class="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-line text-sm font-medium text-soft hover:border-action hover:text-action transition-colors"
      :puzzle-id="puzzle.id"
      :is-favorited="puzzle.isFavorited"
      :favorite-count="puzzle.favoriteCount"
      show-label
      @changed="$emit('favorited', $event)"
    />

    <button
      v-if="isAuthor"
      class="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-line text-sm font-medium text-soft hover:border-action hover:text-action transition-colors"
      @click="$emit('manage')"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      Manage puzzle
    </button>

    <RatePuzzleControl
      v-if="auth.isAuthenticated && puzzle.viewerHasSolved && !isAuthor"
      class="border-t border-line pt-3"
      :puzzle-id="puzzle.id"
      :stars="puzzle.myRating?.stars ?? null"
      :difficulty="puzzle.myRating?.difficultyVote ?? null"
    />

    <SolutionCodeBox
      v-if="puzzle.hasSolutionCode && !puzzle.viewerHasSolved && !isAuthor"
      :puzzle-id="puzzle.id"
      :share-token="shareToken"
      @solved="$emit('solved')"
    />

    <PuzzleStatList :puzzle="puzzle" />
  </div>
</template>
