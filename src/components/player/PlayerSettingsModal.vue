<script setup lang="ts">
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import type { PlayerSettings } from '@/utils/playerSettings'

const player = usePlayerSettingsStore()
const emit = defineEmits<{ close: [] }>()

type Item = { key: keyof PlayerSettings; label: string; hint?: string }
const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Visual',
    items: [
      { key: 'showRowColLabels', label: 'Row & column labels', hint: 'Number the grid edges' },
      { key: 'hideTimer', label: 'Hide timer' },
      { key: 'hideColors', label: 'Hide cell colours', hint: 'Hide the puzzle’s built-in cell colours' },
    ],
  },
  {
    title: 'Gameplay',
    items: [
      { key: 'showRulesOnStart', label: 'Show rules on start' },
      { key: 'highlightSeen', label: 'Highlight seen cells', hint: 'Shade cells the selection can see' },
    ],
  },
  {
    title: 'Checking',
    items: [
      { key: 'checkOnFinish', label: 'Check on finish', hint: 'Detect a solve automatically' },
      { key: 'revealPartialProgress', label: 'Reveal partial progress', hint: 'Let “Check” say if you’re correct so far' },
      { key: 'highlightConflicts', label: 'Highlight conflicts', hint: 'Flag repeated digits' },
      { key: 'highlightConflictingPencilmarks', label: 'Highlight conflicting pencil marks' },
    ],
  },
]

function toggle(key: keyof PlayerSettings) {
  player.settings[key] = !player.settings[key]
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div class="px-6 pt-5 pb-4 border-b border-line flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-ink-text">
            Settings
          </h2>
          <button
            class="text-faint hover:text-soft text-xl leading-none"
            aria-label="Close"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="px-6 py-4 overflow-y-auto flex flex-col gap-5">
          <section
            v-for="group in groups"
            :key="group.title"
            class="flex flex-col gap-1"
          >
            <p class="text-[11px] font-semibold uppercase tracking-widest text-soft mb-1">
              {{ group.title }}
            </p>
            <button
              v-for="item in group.items"
              :key="item.key"
              type="button"
              role="switch"
              :aria-checked="player.settings[item.key]"
              :aria-label="item.label"
              class="flex items-center gap-3 py-1.5 text-left group"
              @click="toggle(item.key)"
            >
              <span class="flex-1 min-w-0">
                <span class="block text-sm text-ink-text">{{ item.label }}</span>
                <span
                  v-if="item.hint"
                  class="block text-xs text-faint leading-snug"
                >{{ item.hint }}</span>
              </span>
              <span
                class="shrink-0 w-9 h-5 rounded-full p-0.5 flex transition-colors"
                :class="player.settings[item.key] ? 'bg-action' : 'bg-line'"
              >
                <span
                  class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                  :class="player.settings[item.key] ? 'translate-x-4' : 'translate-x-0'"
                />
              </span>
            </button>
          </section>
        </div>

        <div class="px-6 py-4 border-t border-line flex justify-end">
          <button
            class="px-5 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep transition-colors"
            @click="emit('close')"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
