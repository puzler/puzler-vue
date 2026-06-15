<script setup lang="ts">
import { mdiRestart, mdiBookOpenVariant, mdiCheckCircleOutline, mdiCogOutline } from '@mdi/js'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'

defineProps<{
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  rules: string
  showTimer: boolean
  elapsedLabel: string
  paused: boolean
}>()

const emit = defineEmits<{ 'toggle-pause': []; 'show-rules': []; 'reset': []; 'settings': []; 'check': [] }>()

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
    <!-- Title, author and rules sit at the top, scrolling if long. -->
    <div class="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-2">
      <div class="flex items-baseline gap-2">
        <h1 class="font-display text-base font-semibold text-ink-text leading-tight">
          {{ title || 'Puzzle' }}
        </h1>
        <div
          v-if="showTimer"
          class="ml-auto shrink-0 flex items-center gap-1.5"
        >
          <span
            class="text-sm font-mono tabular-nums text-ink-text"
            title="Elapsed time"
          >{{ elapsedLabel }}</span>
          <button
            class="w-6 h-6 flex items-center justify-center rounded-md text-soft hover:bg-line/60 active:bg-line transition-colors"
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
        class="text-xs text-faint"
      >
        by <AuthorAttribution
          :author="author"
          :author-name="authorName"
        />
      </p>
      <div
        v-if="rules"
        class="mt-1 text-sm text-ink-text whitespace-pre-line leading-relaxed"
      >
        {{ rules }}
      </div>
      <p
        v-else
        class="mt-1 text-sm italic text-faint"
      >
        No rules provided for this puzzle.
      </p>
    </div>

    <!-- Action controls sit just above the numpad. -->
    <div class="shrink-0 border-t border-line px-3 py-2 flex items-center gap-1">
      <button
        v-for="c in CONTROLS"
        :key="c.event"
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
    <div class="shrink-0 border-t border-line">
      <SolverNumpad class="w-full" />
    </div>
  </aside>
</template>
