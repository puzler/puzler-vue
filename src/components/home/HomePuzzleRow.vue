<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { mdiArrowRight } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import ArchivePuzzleCard from '@/components/archive/ArchivePuzzleCard.vue'
import type { PuzzleCardFieldsFragment } from '@/graphql/generated/types'

defineProps<{ title: string; puzzles: PuzzleCardFieldsFragment[] }>()
</script>

<template>
  <section v-if="puzzles.length">
    <div class="flex items-baseline justify-between mb-3">
      <h2 class="font-display text-xl font-semibold text-ink-text">
        {{ title }}
      </h2>
      <RouterLink
        to="/puzzles"
        class="inline-flex items-center gap-1 text-sm text-action hover:text-action-deep transition-colors"
      >
        See all
        <MdiIcon
          :path="mdiArrowRight"
          :size="16"
        />
      </RouterLink>
    </div>
    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <li
        v-for="puzzle in puzzles"
        :key="puzzle.id"
      >
        <ArchivePuzzleCard :puzzle="puzzle" />
      </li>
    </ul>
  </section>
</template>
