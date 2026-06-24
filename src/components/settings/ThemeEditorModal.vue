<script setup lang="ts">
import { ref, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { constraintFamily, type ConstraintStyleKey } from '@/utils/theme'
import { CHROME_TOKENS, GRID_TOKENS } from '@/utils/appearanceTokens'
import { useFullLineControl } from '@/composables/useFullLineControl'
import ThemeEditorSelector from './ThemeEditorSelector.vue'
import ThemePreview from './ThemePreview.vue'
import ThemeTokenGroup from './ThemeTokenGroup.vue'
import ConstraintControls from './ConstraintControls.vue'
import ThemeManageBar from './ThemeManageBar.vue'

const emit = defineEmits<{ close: [] }>()
const theme = useThemeStore()
const full = useFullLineControl()

type Focus = 'chrome' | 'grid' | ConstraintStyleKey
const focus = ref<Focus>('grid')

const showFullToggle = computed(() => {
  if (focus.value === 'chrome' || focus.value === 'grid') return false
  const fam = constraintFamily(focus.value)
  return fam === 'line' || fam === 'betweenLine'
})

function onRename(e: Event) {
  const name = (e.target as HTMLInputElement).value.trim()
  if (name) theme.renameTheme(theme.activeThemeId, name)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div class="px-5 pt-4 pb-3 border-b border-line flex items-center gap-3">
          <h2 class="font-display text-base font-semibold text-ink-text shrink-0">
            Theme editor
          </h2>
          <input
            v-if="!theme.isActiveBuiltIn"
            type="text"
            class="flex-1 min-w-0 max-w-56 bg-paper border border-line rounded-lg px-2.5 py-1 text-sm text-ink-text focus:border-action focus:outline-none"
            :value="theme.activeTheme.name"
            maxlength="60"
            aria-label="Theme name"
            @change="onRename"
          >
          <label
            v-if="showFullToggle"
            class="ml-auto flex items-center gap-1.5 text-xs text-soft cursor-pointer"
          >
            <input
              v-model="full"
              type="checkbox"
              class="accent-action"
            >
            Full line control
          </label>
          <button
            class="text-faint hover:text-soft text-xl leading-none"
            :class="showFullToggle ? 'ml-3' : 'ml-auto'"
            aria-label="Close"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div
          v-if="theme.isActiveBuiltIn"
          class="p-8 text-center text-sm text-soft"
        >
          <p class="mb-4">
            Built-in themes can't be edited. Duplicate this one to customize it.
          </p>
          <button
            class="px-4 py-2 rounded-lg bg-action text-white text-sm font-medium hover:bg-action-deep transition-colors"
            @click="theme.duplicateTheme(theme.activeThemeId)"
          >
            Duplicate to edit
          </button>
        </div>

        <div
          v-else
          class="flex flex-1 min-h-0"
        >
          <ThemeEditorSelector
            class="w-44 border-r border-line overflow-y-auto shrink-0"
            :selected="focus"
            @select="focus = $event"
          />
          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div class="w-full max-w-[280px]">
              <ThemePreview
                :theme="theme.activeTheme"
                :focus="focus"
              />
            </div>
            <ThemeTokenGroup
              v-if="focus === 'chrome'"
              title="App chrome"
              subtitle="Everything outside the grid. Always applied."
              group="chrome"
              :tokens="CHROME_TOKENS"
            />
            <ThemeTokenGroup
              v-else-if="focus === 'grid'"
              title="Grid"
              subtitle="The puzzle board. Reverted when Enable custom styles is off."
              group="grid"
              :tokens="GRID_TOKENS"
            />
            <ConstraintControls
              v-else
              :ckey="focus"
            />
          </div>
        </div>

        <ThemeManageBar @close="emit('close')" />
      </div>
    </div>
  </Teleport>
</template>
