<script setup lang="ts">
import { computed } from 'vue'
import { mdiClose } from '@mdi/js'
import { usePuzzleStore } from '@/stores/puzzle'
import { PuzzleStatusEnum } from '@/graphql/generated/types'
import MdiIcon from '@/components/MdiIcon.vue'
import PuzzleSettingsTabBar from './PuzzleSettingsTabBar.vue'
import { PUZZLE_SETTINGS_TABS } from './puzzleSettingsTabs'

// Shared chrome for the puzzle-settings modals (Manage on the puzzle page,
// Publish & Share in the editor): roomy 720px card on desktop, full-screen sheet
// on mobile, status badge, section tabs, and an error line. Each caller supplies
// the tab panels in the default slot and its own footer actions via #footer.
defineProps<{ heading: string; error: string | null }>()
const emit = defineEmits<{ close: [] }>()
const activeTab = defineModel<string>('activeTab', { required: true })
const puzzle = usePuzzleStore()
const isPublished = computed(() => puzzle.status === PuzzleStatusEnum.Published)
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 z-50 flex items-stretch justify-center sm:items-center sm:p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface shadow-xl flex flex-col w-full h-full rounded-none overflow-hidden sm:w-[720px] sm:max-w-[calc(100vw-2rem)] sm:h-auto sm:max-h-[85vh] sm:rounded-2xl">
        <div class="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-line shrink-0">
          <span class="text-sm font-semibold text-ink-text truncate">{{ heading }}</span>
          <div class="flex items-center gap-2 shrink-0">
            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="isPublished ? 'bg-green-100 text-green-700' : 'bg-line text-soft'"
            >{{ isPublished ? `Published · ${puzzle.visibility}` : 'Draft' }}</span>
            <button
              class="text-faint hover:text-ink-text"
              aria-label="Close"
              @click="emit('close')"
            >
              <MdiIcon
                :path="mdiClose"
                :size="20"
              />
            </button>
          </div>
        </div>

        <PuzzleSettingsTabBar
          v-model="activeTab"
          :tabs="PUZZLE_SETTINGS_TABS"
        />

        <p
          v-if="error"
          class="px-4 sm:px-5 pt-3 text-xs text-red-600 shrink-0"
        >
          {{ error }}
        </p>

        <slot />

        <div class="flex items-center gap-3 px-4 sm:px-5 py-3 border-t border-line shrink-0">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
