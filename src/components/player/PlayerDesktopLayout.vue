<script setup lang="ts">
// Desktop solver view: the grid on the left, the side panel (rules, controls,
// numpad) on the right. Mirrors PlayerMobileLayout — both read the editor store
// directly for the grid and forward the same panel props/events.
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import PausedOverlay from '@/components/player/PausedOverlay.vue'
import PlayerSidePanel from '@/components/player/PlayerSidePanel.vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

defineProps<{
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  rules: string
  showTimer: boolean
  elapsedLabel: string
  paused: boolean
  collaborationEnabled: boolean
  favorite?: { puzzleId: string; isFavorited: boolean; favoriteCount: number } | null
}>()

defineEmits<{
  'toggle-pause': []; 'show-rules': []; 'reset': []; 'settings': []; 'check': []; 'collaborate': []
}>()
</script>

<template>
  <div class="flex-1 flex overflow-hidden min-h-0">
    <main
      data-tour="player-grid"
      class="relative flex-1 bg-canvas overflow-hidden min-h-0"
    >
      <SudokuGrid
        mode="edit"
        :given-digits="editor.givenDigits"
        :cell-states="editor.solverCellStates"
        :selection="editor.selection"
        @update:selection="editor.selection = $event"
        @clear-selection="editor.clearSelection()"
      />
      <PausedOverlay
        v-if="paused"
        @resume="$emit('toggle-pause')"
      />
    </main>
    <PlayerSidePanel
      :title="title"
      :author="author"
      :author-name="authorName"
      :rules="rules"
      :show-timer="showTimer"
      :elapsed-label="elapsedLabel"
      :paused="paused"
      :collaboration-enabled="collaborationEnabled"
      :favorite="favorite"
      @toggle-pause="$emit('toggle-pause')"
      @show-rules="$emit('show-rules')"
      @reset="$emit('reset')"
      @settings="$emit('settings')"
      @check="$emit('check')"
      @collaborate="$emit('collaborate')"
    />
  </div>
</template>
