<script setup lang="ts">
import { RouterLink } from 'vue-router'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiLockOutline, mdiCheckCircle } from '@mdi/js'

type CollectionPuzzle = { id: string; title: string; avgRating?: number | null; shareToken?: string | null }

const props = defineProps<{
  puzzles: CollectionPuzzle[]
  isSequence: boolean
  solved: Set<string>
  collectionId: string
  shareToken: string | null
}>()

// The collection context (`collection` + `ct`) powers next-puzzle navigation. A
// container-only puzzle isn't public, so we also pass its own share token, which
// the API surfaces only because we can already see this collection.
function puzzleLink(puzzle: CollectionPuzzle): Record<string, string> {
  return {
    collection: props.collectionId,
    ...(props.shareToken ? { ct: props.shareToken } : {}),
    ...(puzzle.shareToken ? { t: puzzle.shareToken } : {}),
  }
}

// In a sequence collection, a puzzle unlocks only once every earlier one is solved.
function isUnlocked(index: number): boolean {
  if (!props.isSequence) return true
  return props.puzzles.slice(0, index).every((p) => props.solved.has(p.id))
}
</script>

<template>
  <ol class="mt-6 flex flex-col gap-3">
    <li
      v-for="(puzzle, index) in puzzles"
      :key="puzzle.id"
    >
      <RouterLink
        v-if="isUnlocked(index)"
        :to="{ name: 'player', params: { id: puzzle.id }, query: puzzleLink(puzzle) }"
        class="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-action hover:bg-action-tint transition-colors"
      >
        <span
          v-if="isSequence"
          class="text-sm text-faint w-5 text-right shrink-0"
        >{{ index + 1 }}</span>
        <span class="font-medium text-ink-text truncate flex-1">{{ puzzle.title }}</span>
        <MdiIcon
          v-if="solved.has(puzzle.id)"
          :path="mdiCheckCircle"
          :size="16"
          class="text-green-500 shrink-0"
        />
        <span
          v-else-if="puzzle.avgRating"
          class="text-xs text-faint shrink-0"
        >★ {{ puzzle.avgRating.toFixed(1) }}</span>
      </RouterLink>
      <div
        v-else
        class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-line text-faint cursor-not-allowed"
      >
        <span class="text-sm w-5 text-right shrink-0">{{ index + 1 }}</span>
        <span class="truncate flex-1">{{ puzzle.title }}</span>
        <MdiIcon
          :path="mdiLockOutline"
          :size="16"
          class="shrink-0"
        />
      </div>
    </li>
  </ol>
</template>
