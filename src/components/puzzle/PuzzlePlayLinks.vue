<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

// The two play actions on the description page. "Play on Puzler" opens the
// solver (forwarding the share token / collection context); "Play on SudokuPad"
// is a short sudokupad.app link cached at publish time (absent for puzzles that
// predate the feature or can't be exported, e.g. non-square grids).
// `block` stacks the buttons full-width (for the play rail); default is an
// inline wrapping row.
defineProps<{
  playTo: RouteLocationRaw
  sudokupadUrl?: string | null
  sudokupadIncludesSolution?: boolean
  block?: boolean
}>()

const BTN = 'px-5 py-2.5 rounded-xl font-medium transition-colors'
</script>

<template>
  <div :class="block ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-3'">
    <RouterLink
      :to="playTo"
      :class="[BTN, 'bg-action text-on-action hover:opacity-90', block ? 'text-center' : '']"
    >
      Play on Puzler
    </RouterLink>
    <a
      v-if="sudokupadUrl"
      :href="sudokupadUrl"
      target="_blank"
      rel="noopener"
      :class="[BTN, 'border border-line text-ink-text hover:border-action hover:bg-action-tint', block ? 'text-center' : '']"
    >
      Play on SudokuPad
    </a>
    <span
      v-if="sudokupadUrl && sudokupadIncludesSolution"
      class="text-xs text-faint"
      :class="block ? 'text-center' : ''"
    >checks your solution</span>
  </div>
</template>
