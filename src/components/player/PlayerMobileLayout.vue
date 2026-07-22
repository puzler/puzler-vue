<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiBookOpenVariant, mdiRestart, mdiCheckCircleOutline, mdiCogOutline, mdiAccountMultiple, mdiCalculatorVariantOutline } from '@mdi/js'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ZoomControls from '@/components/grid/ZoomControls.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import BackToPuzzleLink from '@/components/player/BackToPuzzleLink.vue'
import SolverTimerPill from '@/components/player/SolverTimerPill.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import PausedOverlay from '@/components/player/PausedOverlay.vue'
import LiveSyncBadge from '@/components/player/LiveSyncBadge.vue'
import PlayersPanel from '@/components/player/PlayersPanel.vue'
import ConnectionStatus from '@/components/player/ConnectionStatus.vue'
import HelperSheet from '@/components/player/helpers/HelperSheet.vue'
import { useEditorStore } from '@/stores/editor'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { useHelpersAvailable } from '@/composables/useMathHelpers'

const editor = useEditorStore()
const player = usePlayerSettingsStore()
const helpersAvailable = useHelpersAvailable()

// The helper sheet is layout-local UI (not a modal PlayerView owns): it slides
// over the numpad while the grid stays interactive above it.
const showHelpers = ref(false)
const helpersEnabled = computed(
  () =>
    helpersAvailable.value &&
    (player.effective.enableSelectionCalculator ||
      player.effective.enableKillerHelper ||
      player.effective.enableSumHelper),
)

const props = defineProps<{
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  showTimer: boolean
  elapsedLabel: string
  paused: boolean
  collaborationEnabled: boolean
  checkLabel?: string
}>()

const emit = defineEmits<{ 'toggle-pause': []; 'reset': []; 'show-rules': []; 'check': []; 'settings': []; 'collaborate': [] }>()

// The grid stays on top, full-bleed; the numpad fills the fixed bottom panel,
// with a thin action rail down the side (rules opens the modal, reset, …).
const BTN = 'w-9 h-9 flex items-center justify-center rounded-lg text-soft hover:bg-line/60 active:bg-line transition-colors'

interface RailItem { icon: string; label: string; title: string; tour?: string; pressed?: boolean; run: () => void }
const RAIL = computed<RailItem[]>(() => {
  const items: RailItem[] = [
    { icon: mdiBookOpenVariant, label: 'Show rules', title: 'Rules', tour: 'player-rules', run: () => emit('show-rules') },
    {
      icon: mdiCheckCircleOutline,
      label: props.checkLabel ?? 'Check solution',
      title: props.checkLabel ?? 'Check solution',
      tour: 'player-check',
      run: () => emit('check'),
    },
    { icon: mdiCogOutline, label: 'Settings', title: 'Settings', run: () => emit('settings') },
    { icon: mdiRestart, label: 'Reset puzzle', title: 'Reset puzzle', run: () => emit('reset') },
  ]
  if (props.collaborationEnabled) {
    items.push({ icon: mdiAccountMultiple, label: 'Collaborate', title: 'Collaborate', run: () => emit('collaborate') })
  }
  if (helpersEnabled.value) {
    items.push({
      icon: mdiCalculatorVariantOutline,
      label: 'Math helpers',
      title: 'Helpers',
      pressed: showHelpers.value,
      run: () => { showHelpers.value = !showHelpers.value },
    })
  }
  return items
})
</script>

<template>
  <div class="relative flex-1 flex flex-col overflow-hidden">
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
      <ZoomControls />
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
          :key="b.label"
          :data-tour="b.tour"
          :class="BTN"
          :title="b.title"
          :aria-label="b.label"
          :aria-pressed="b.pressed"
          @click="b.run()"
        >
          <MdiIcon
            :path="b.icon"
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

    <HelperSheet
      v-if="helpersEnabled && showHelpers"
      @close="showHelpers = false"
    />
  </div>
</template>
