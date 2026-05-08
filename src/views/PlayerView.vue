<template>
  <div class="min-h-screen p-8">
    <h1 class="text-2xl font-bold mb-4">
      Puzzle Player
    </h1>
    <p class="text-gray-500">
      Puzzle ID: {{ puzzleId }}
    </p>
    <p class="text-gray-500 mt-2">
      — Player coming in Phase 5 —
    </p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const puzzleId = route.params.id as string
</script>
