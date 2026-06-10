<template>
  <div class="min-h-screen p-8">
    <h1 class="font-display text-2xl font-bold mb-4">
      Puzzle Player
    </h1>
    <p class="text-soft">
      Puzzle ID: {{ puzzleId }}
    </p>
    <p class="text-soft mt-2">
      — Player coming in Phase 5 —
    </p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const puzzleId = route.params.id as string
</script>
