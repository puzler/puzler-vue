<script setup lang="ts">
import { ref } from 'vue'
import ContentPage from '@/components/ContentPage.vue'
import ArchivePuzzlesPanel from '@/components/archive/ArchivePuzzlesPanel.vue'
import ArchiveCollectionsPanel from '@/components/archive/ArchiveCollectionsPanel.vue'
import ArchiveSeriesPanel from '@/components/archive/ArchiveSeriesPanel.vue'
import { usePageTour } from '@/composables/usePageTour'

usePageTour()

const tab = ref<'puzzles' | 'collections' | 'series'>('puzzles')
const TAB = 'px-3 py-1.5 text-sm transition-colors border-b-2'
function tabClass(name: typeof tab.value) {
  return tab.value === name ? 'text-action border-action font-medium' : 'text-soft border-transparent hover:text-ink-text'
}
</script>

<template>
  <ContentPage>
    <div class="p-8 w-full max-w-5xl mx-auto">
      <h1 class="font-display text-2xl font-bold mb-6">
        Puzzle Archive
      </h1>

      <div
        data-tour="archive-tabs"
        class="flex gap-2 mb-6 border-b border-line"
      >
        <button
          :class="[TAB, tabClass('puzzles')]"
          @click="tab = 'puzzles'"
        >
          Puzzles
        </button>
        <button
          :class="[TAB, tabClass('collections')]"
          @click="tab = 'collections'"
        >
          Collections
        </button>
        <button
          :class="[TAB, tabClass('series')]"
          @click="tab = 'series'"
        >
          Series
        </button>
      </div>

      <ArchivePuzzlesPanel v-if="tab === 'puzzles'" />
      <ArchiveCollectionsPanel v-else-if="tab === 'collections'" />
      <ArchiveSeriesPanel v-else />
    </div>
  </ContentPage>
</template>
