<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiTimerOutline } from '@mdi/js'
import { useCompetitionStore } from '@/stores/competition'

// The always-visible reminder that a clock is running: rendered under the
// NavBar on every page while the viewer has an active competition run.
// Links back to the competition's puzzle list.
const competition = useCompetitionStore()

const urgent = computed(() => competition.remainingSeconds < 300)
</script>

<template>
  <RouterLink
    v-if="competition.isActive && competition.run"
    :to="{
      name: 'collection',
      params: { id: competition.run.collectionId },
      query: competition.run.shareToken ? { t: competition.run.shareToken } : {},
    }"
    class="shrink-0 flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium transition-colors"
    :class="urgent ? 'bg-red-700 text-white' : 'bg-action text-on-action hover:bg-action-deep'"
  >
    <MdiIcon
      :path="mdiTimerOutline"
      :size="16"
    />
    <span class="font-display tabular-nums">{{ competition.remainingLabel }}</span>
    <span class="truncate">· {{ competition.run.collectionTitle }} — back to the puzzles</span>
  </RouterLink>
</template>
