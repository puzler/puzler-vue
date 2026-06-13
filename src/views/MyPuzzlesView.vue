<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import PuzzlesPanel from '@/components/mypuzzles/PuzzlesPanel.vue'
import CollectionsPanel from '@/components/mypuzzles/CollectionsPanel.vue'

const tab = ref<'puzzles' | 'collections'>('puzzles')
const TAB = 'px-3 py-1.5 text-sm transition-colors border-b-2'
function tabClass(name: typeof tab.value) {
  return tab.value === name ? 'text-action border-action font-medium' : 'text-soft border-transparent hover:text-ink-text'
}
</script>

<template>
  <ContentPage>
    <div class="p-8 max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="font-display text-2xl font-bold">
          My Puzzles
        </h1>
        <RouterLink
          :to="{ name: 'editor-new' }"
          class="px-3 py-1.5 text-sm rounded-lg bg-action text-white hover:bg-action-deep"
        >
          New puzzle
        </RouterLink>
      </div>

      <div class="flex gap-2 mb-6 border-b border-line">
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
      </div>

      <PuzzlesPanel v-if="tab === 'puzzles'" />
      <CollectionsPanel v-else />
    </div>
  </ContentPage>
</template>
