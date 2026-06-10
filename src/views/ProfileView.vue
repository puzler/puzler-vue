<template>
  <div class="min-h-screen p-8">
    <h1 class="font-display text-2xl font-bold mb-4">
      @{{ username }}
    </h1>
    <p class="text-soft">
      — Profile coming in Phase 6 —
    </p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const username = route.params.username as string
</script>
