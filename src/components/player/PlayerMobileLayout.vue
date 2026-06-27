<script setup lang="ts">
import { mdiBookOpenVariant, mdiRestart, mdiCheckCircleOutline, mdiCogOutline, mdiAccountMultiple } from '@mdi/js'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import BackToPuzzleLink from '@/components/player/BackToPuzzleLink.vue'
import SolverTimerPill from '@/components/player/SolverTimerPill.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import PausedOverlay from '@/components/player/PausedOverlay.vue'
import LiveSyncBadge from '@/components/player/LiveSyncBadge.vue'
import PlayersPanel from '@/components/player/PlayersPanel.vue'
import ConnectionStatus from '@/components/player/ConnectionStatus.vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

defineProps<{
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  showTimer: boolean
  elapsedLabel: string
  paused: boolean
  collaborationEnabled: boolean
}>()

const emit = defineEmits<{ 'toggle-pause': []; 'reset': []; 'show-rules': []; 'check': []; 'settings': []; 'collaborate': [] }>()

// The grid stays on top, full-bleed; the numpad fills the fixed bottom panel,
// with a thin action rail down the side (rules opens the modal, reset, …).
const BTN = 'w-9 h-9 flex items-center justify-center rounded-lg text-soft hover:bg-line/60 active:bg-line transition-colors'

type Action = 'show-rules' | 'check' | 'settings' | 'reset'
const fire = emit as unknown as (e: Action) => void
const RAIL: { icon: string; label: string; title: string; event: Action }[] = [
  { icon: mdiBookOpenVariant, label: 'Show rules', title: 'Rules', event: 'show-rules' },
  { icon: mdiCheckCircleOutline, label: 'Check solution', title: 'Check solution', event: 'check' },
  { icon: mdiCogOutline, label: 'Settings', title: 'Settings', event: 'settings' },
  { icon: mdiRestart, label: 'Reset puzzle', title: 'Reset puzzle', event: 'reset' },
]
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="px-3 py-2 border-b border-line bg-paper shrink-0 flex items-center gap-2">
      <BackToPuzzleLink
        icon-only
        class="shrink-0 -ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-soft hover:text-action hover:bg-action-tint transition-colors"
      />
      <div class="min-w-0 flex flex-col">
        <h1 class="font-display text-base font-semibold text-ink-text leading-tight truncate">
          {{ title || 'Puzzle' }}
        </h1>
        <span
          v-if="author"
          class="text-xs text-soft truncate"
        >by <AuthorAttribution
          :author="author"
          :author-name="authorName"
        /></span>
      </div>
      <LiveSyncBadge />
      <PlayersPanel />
      <ConnectionStatus />
      <SolverTimerPill
        v-if="showTimer"
        class="ml-auto"
        :elapsed-label="elapsedLabel"
        :paused="paused"
        @toggle-pause="$emit('toggle-pause')"
      />
    </header>

    <div
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
        resume-verb="Tap"
        @resume="$emit('toggle-pause')"
      />
    </div>

    <div class="h-72 flex border-t border-line shrink-0">
      <div
        data-tour="player-controls"
        class="flex flex-col items-center gap-2 py-3 px-1.5 border-r border-line bg-surface shrink-0 w-12"
      >
        <button
          v-for="b in RAIL"
          :key="b.event"
          :data-tour="b.event === 'show-rules' ? 'player-rules' : b.event === 'check' ? 'player-check' : undefined"
          :class="BTN"
          :title="b.title"
          :aria-label="b.label"
          @click="fire(b.event)"
        >
          <MdiIcon
            :path="b.icon"
            :size="20"
          />
        </button>
        <button
          v-if="collaborationEnabled"
          :class="BTN"
          title="Collaborate"
          aria-label="Collaborate"
          @click="$emit('collaborate')"
        >
          <MdiIcon
            :path="mdiAccountMultiple"
            :size="20"
          />
        </button>
      </div>
      <div
        data-tour="player-numpad"
        class="flex-1 overflow-hidden bg-surface"
      >
        <SolverNumpad class="w-full h-full" />
      </div>
    </div>
  </div>
</template>
