<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8">
    <h1 class="text-5xl font-bold mb-4">
      Puzler
    </h1>
    <p class="text-xl text-gray-500 mb-8">
      Create and solve variant sudoku puzzles
    </p>
    <div class="flex gap-4">
      <RouterLink
        to="/puzzles"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Browse Puzzles
      </RouterLink>
      <RouterLink
        to="/editor"
        class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Set a Puzzle
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
