<script setup lang="ts">
import { mdiRestart, mdiBookOpenVariant, mdiCheckCircleOutline, mdiCogOutline, mdiAccountMultiple } from '@mdi/js'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import BackToPuzzleLink from '@/components/player/BackToPuzzleLink.vue'
import SolverTimerPill from '@/components/player/SolverTimerPill.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import PlayerRulesPanel from '@/components/player/PlayerRulesPanel.vue'
import LiveSyncBadge from '@/components/player/LiveSyncBadge.vue'
import PlayersPanel from '@/components/player/PlayersPanel.vue'
import ConnectionStatus from '@/components/player/ConnectionStatus.vue'
import FavoriteButton from '@/components/puzzle/FavoriteButton.vue'

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

const emit = defineEmits<{ 'toggle-pause': []; 'show-rules': []; 'reset': []; 'settings': []; 'check': []; 'collaborate': [] }>()

const ICON_BTN = 'w-9 h-9 flex items-center justify-center rounded-lg text-soft hover:bg-action-tint hover:text-action active:bg-action-tint transition-colors'

type Action = 'show-rules' | 'reset' | 'settings' | 'check'
const fire = emit as unknown as (e: Action) => void
const CONTROLS: { icon: string; label: string; title: string; event: Action; end?: boolean }[] = [
  { icon: mdiBookOpenVariant, label: 'Show rules', title: 'Rules', event: 'show-rules' },
  { icon: mdiRestart, label: 'Reset puzzle', title: 'Reset puzzle', event: 'reset' },
  { icon: mdiCogOutline, label: 'Settings', title: 'Settings', event: 'settings' },
  { icon: mdiCheckCircleOutline, label: 'Check solution', title: 'Check solution', event: 'check', end: true },
]
</script>

<template>
  <aside class="shrink-0 w-72 border-l border-line bg-paper flex flex-col min-h-0">
    <!-- Title, author and rules sit at the top; the rules scroll within a card. -->
    <div class="flex-1 min-h-0 p-3 flex flex-col gap-3">
      <div class="shrink-0 flex flex-col gap-1.5 px-1">
        <BackToPuzzleLink class="self-start text-xs text-soft hover:text-action transition-colors" />
        <div class="flex items-start gap-2">
          <h1 class="flex-1 min-w-0 font-display text-lg font-semibold text-ink-text leading-snug">
            {{ title || 'Puzzle' }}
          </h1>
          <SolverTimerPill
            v-if="showTimer"
            :elapsed-label="elapsedLabel"
            :paused="paused"
            @toggle-pause="$emit('toggle-pause')"
          />
        </div>
        <p
          v-if="author"
          class="text-xs text-soft"
        >
          by <AuthorAttribution
            :author="author"
            :author-name="authorName"
          />
        </p>
        <div class="flex flex-wrap items-center gap-1.5">
          <LiveSyncBadge />
          <PlayersPanel />
          <ConnectionStatus />
        </div>
      </div>

      <PlayerRulesPanel
        :rules="rules"
        data-tour="player-rules"
      />
    </div>

    <!-- Action controls sit just above the numpad. -->
    <div
      data-tour="player-controls"
      class="shrink-0 border-t border-line px-3 py-2 flex items-center gap-1"
    >
      <button
        v-if="collaborationEnabled"
        :class="ICON_BTN"
        title="Collaborate"
        aria-label="Collaborate"
        @click="$emit('collaborate')"
      >
        <MdiIcon
          :path="mdiAccountMultiple"
          :size="20"
        />
      </button>
      <FavoriteButton
        v-if="favorite"
        :class="ICON_BTN"
        :puzzle-id="favorite.puzzleId"
        :is-favorited="favorite.isFavorited"
        :favorite-count="favorite.favoriteCount"
      />
      <button
        v-for="c in CONTROLS"
        :key="c.event"
        :data-tour="c.event === 'check' ? 'player-check' : undefined"
        :class="[ICON_BTN, c.end ? 'ml-auto' : '']"
        :title="c.title"
        :aria-label="c.label"
        @click="fire(c.event)"
      >
        <MdiIcon
          :path="c.icon"
          :size="20"
        />
      </button>
    </div>

    <!-- Numpad anchored to the bottom of the panel. -->
    <div
      data-tour="player-numpad"
      class="shrink-0 border-t border-line"
    >
      <SolverNumpad class="w-full" />
    </div>
  </aside>
</template>
