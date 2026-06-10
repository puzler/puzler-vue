<template>
  <div class="flex-1 flex flex-col items-center justify-center p-8">
    <h1 class="font-display text-5xl font-bold mb-4">
      Puzler
    </h1>
    <p class="text-xl text-soft mb-8">
      Create and solve variant sudoku puzzles
    </p>
    <div class="flex gap-4">
      <RouterLink
        to="/puzzles"
        class="px-6 py-3 bg-action text-white rounded-lg hover:bg-action-deep"
      >
        Browse Puzzles
      </RouterLink>
      <RouterLink
        to="/editor"
        class="px-6 py-3 border border-line rounded-lg hover:bg-line/40"
      >
        Set a Puzzle
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
