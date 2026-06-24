<script setup lang="ts">
import { ref } from 'vue'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { useThemeStore } from '@/stores/theme'
import type { PlayerSettings } from '@/utils/playerSettings'
import ThemeEditorModal from '@/components/settings/ThemeEditorModal.vue'

const player = usePlayerSettingsStore()
const theme = useThemeStore()
const emit = defineEmits<{ close: [] }>()
const showThemeEditor = ref(false)

// An item reads its on/off via `on()` and flips via `toggle()`, so a row can be backed by the
// player-settings store OR the theme store (the Enable custom styles gate) uniformly.
type Item = { label: string; hint?: string; on: () => boolean; toggle: () => void }

function ps(key: keyof PlayerSettings, label: string, hint?: string): Item {
  return {
    label,
    hint,
    on: () => player.settings[key],
    toggle: () => { player.settings[key] = !player.settings[key] },
  }
}

const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Appearance',
    items: [
      {
        label: 'Enable custom styles',
        hint: 'Apply your theme to the grid; turn off to see a puzzle’s intended colours',
        on: () => theme.enableCustomStyles,
        toggle: () => theme.setEnableCustomStyles(!theme.enableCustomStyles),
      },
    ],
  },
  {
    title: 'Visual',
    items: [
      ps('showRowColLabels', 'Row & column labels', 'Number the grid edges'),
      ps('hideTimer', 'Hide timer'),
      ps('hideColors', 'Hide cell colours', 'Hide the puzzle’s built-in cell colours'),
    ],
  },
  {
    title: 'Gameplay',
    items: [
      ps('showRulesOnStart', 'Show rules on start'),
      ps('highlightSeen', 'Highlight seen cells', 'Shade cells the selection can see'),
    ],
  },
  {
    title: 'Checking',
    items: [
      ps('checkOnFinish', 'Check on finish', 'Detect a solve automatically'),
      ps('revealPartialProgress', 'Reveal partial progress', 'Let “Check” say if you’re correct so far'),
      ps('highlightConflicts', 'Highlight conflicts', 'Flag repeated digits'),
      ps('highlightConflictingPencilmarks', 'Highlight conflicting pencil marks'),
    ],
  },
]
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
              :key="item.label"
              type="button"
              role="switch"
              :aria-checked="item.on()"
              :aria-label="item.label"
              class="flex items-center gap-3 py-1.5 text-left group"
              @click="item.toggle()"
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
                :class="item.on() ? 'bg-action' : 'bg-line'"
              >
                <span
                  class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                  :class="item.on() ? 'translate-x-4' : 'translate-x-0'"
                />
              </span>
            </button>
            <button
              v-if="group.title === 'Appearance'"
              type="button"
              class="mt-1 self-start text-sm font-medium text-action hover:text-action-deep transition-colors"
              @click="showThemeEditor = true"
            >
              Edit theme styles
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
  <ThemeEditorModal
    v-if="showThemeEditor"
    @close="showThemeEditor = false"
  />
</template>
