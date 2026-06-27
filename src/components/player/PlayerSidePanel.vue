<script setup lang="ts">
import { mdiRestart, mdiBookOpenVariant, mdiCheckCircleOutline, mdiCogOutline, mdiAccountMultiple } from '@mdi/js'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import PlayerRulesPanel from '@/components/player/PlayerRulesPanel.vue'
import LiveSyncBadge from '@/components/player/LiveSyncBadge.vue'
import PlayersPanel from '@/components/player/PlayersPanel.vue'
import ConnectionStatus from '@/components/player/ConnectionStatus.vue'

defineProps<{
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  rules: string
  showTimer: boolean
  elapsedLabel: string
  paused: boolean
  collaborationEnabled: boolean
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
        <div class="flex items-start gap-2">
          <h1 class="flex-1 min-w-0 font-display text-lg font-semibold text-ink-text leading-snug">
            {{ title || 'Puzzle' }}
          </h1>
          <div
            v-if="showTimer"
            data-tour="player-timer"
            class="shrink-0 flex items-center gap-0.5 rounded-full border border-line bg-surface pl-2.5 pr-0.5 py-0.5"
          >
            <span
              class="font-mono text-sm tabular-nums text-ink-text"
              title="Elapsed time"
            >{{ elapsedLabel }}</span>
            <button
              class="w-5 h-5 flex items-center justify-center rounded-full text-[11px] text-soft hover:text-action transition-colors"
              :title="paused ? 'Resume' : 'Pause'"
              :aria-label="paused ? 'Resume timer' : 'Pause timer'"
              @click="$emit('toggle-pause')"
            >
              {{ paused ? '▶' : '⏸' }}
            </button>
          </div>
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
