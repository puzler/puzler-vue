<script setup lang="ts">
import { startTour } from '@/composables/useTourRunner'
import { TOUR_LABELS, type TourKey } from '@/data/tours'

// Listed in the order a new user typically meets them.
const replayOrder: TourKey[] = [
  'home', 'archive', 'player', 'editor', 'collection', 'series', 'my-puzzles', 'profile', 'feed', 'settings',
]
</script>

<template>
  <section
    data-tour="settings-tours"
    class="bg-paper border border-line rounded-xl p-6"
  >
    <h2 class="font-display text-lg font-semibold mb-1">
      Walkthroughs
    </h2>
    <p class="text-sm text-soft mb-4">
      Short guided tours that point out the tools on each page. They never pop up on
      their own. Start one here whenever you want a refresher, or tap the help button
      in the header to tour whatever page you are on.
    </p>

    <p class="text-xs font-semibold uppercase tracking-widest text-faint mb-2">
      Start a walkthrough
    </p>
    <ul class="flex flex-wrap gap-2">
      <li
        v-for="key in replayOrder"
        :key="key"
      >
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-sm border border-line text-soft hover:text-action hover:border-action transition-colors"
          @click="startTour(key)"
        >
          {{ TOUR_LABELS[key] }}
        </button>
      </li>
    </ul>
  </section>
</template>
