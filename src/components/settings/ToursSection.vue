<script setup lang="ts">
import { ref } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import { startTour } from '@/composables/useTourRunner'
import { TOUR_LABELS, type TourKey } from '@/data/tours'
import ConfirmModal from '@/components/ConfirmModal.vue'

const onboarding = useOnboardingStore()
const showReset = ref(false)

// Listed in the order a new user typically meets them.
const replayOrder: TourKey[] = [
  'home', 'archive', 'player', 'editor', 'collection', 'series', 'my-puzzles', 'profile', 'feed', 'settings',
]

function confirmReset() {
  onboarding.resetAll()
  showReset.value = false
}
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
      First-visit tips that point out the tools on each page. Replay one any time, or turn them off.
    </p>

    <button
      type="button"
      role="switch"
      :aria-checked="!onboarding.state.disabled"
      aria-label="Show tips and walkthroughs"
      class="flex items-center gap-3 py-2 mb-4 w-full text-left border-y border-line"
      @click="onboarding.setDisabled(!onboarding.state.disabled)"
    >
      <span class="flex-1 min-w-0">
        <span class="block text-sm text-ink-text">Show tips and walkthroughs</span>
        <span class="block text-xs text-faint leading-snug">Automatically start a short tour the first time you visit each page.</span>
      </span>
      <span
        class="shrink-0 w-9 h-5 rounded-full p-0.5 flex transition-colors"
        :class="!onboarding.state.disabled ? 'bg-action' : 'bg-line'"
      >
        <span
          class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
          :class="!onboarding.state.disabled ? 'translate-x-4' : 'translate-x-0'"
        />
      </span>
    </button>

    <p class="text-xs font-semibold uppercase tracking-widest text-faint mb-2">
      Replay a walkthrough
    </p>
    <ul class="flex flex-wrap gap-2 mb-4">
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

    <button
      type="button"
      class="px-4 py-2 rounded-lg text-sm border border-line text-soft hover:text-ink-text hover:bg-action-tint transition-colors"
      @click="showReset = true"
    >
      Reset all tours
    </button>
    <p class="mt-1.5 text-xs text-faint">
      Clears your history so every page shows its walkthrough again on your next visit.
    </p>

    <ConfirmModal
      v-if="showReset"
      message="Reset all walkthroughs? Each page will show its first-visit tour again."
      confirm-label="Reset"
      @confirm="confirmReset"
      @cancel="showReset = false"
    />
  </section>
</template>
