<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { getBuiltInTheme } from '@/utils/themePresets'

// Theme management strip for the editor modal footer: switch active theme, create/duplicate/
// delete, reset, and Done. Makes the modal self-contained when opened from the puzzle toolbar.
const emit = defineEmits<{ close: [] }>()
const theme = useThemeStore()

const baseName = () => getBuiltInTheme(theme.activeTheme.basePresetId)?.name ?? 'default'
</script>

<template>
  <div class="px-5 py-3 border-t border-line flex flex-wrap items-center gap-2">
    <select
      class="bg-paper border border-line rounded-lg px-2 py-1 text-sm text-ink-text"
      :value="theme.activeThemeId"
      aria-label="Active theme"
      @change="theme.setActiveTheme(($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="t in theme.allThemes"
        :key="t.id"
        :value="t.id"
      >
        {{ t.name }}
      </option>
    </select>
    <button
      type="button"
      class="px-2.5 py-1 rounded-lg text-sm border border-line bg-surface hover:bg-line/40 transition-colors"
      @click="theme.createThemeFrom(theme.activeThemeId)"
    >
      New
    </button>
    <button
      type="button"
      class="px-2.5 py-1 rounded-lg text-sm border border-line bg-surface hover:bg-line/40 transition-colors"
      @click="theme.duplicateTheme(theme.activeThemeId)"
    >
      Duplicate
    </button>
    <button
      v-if="!theme.isActiveBuiltIn"
      type="button"
      class="px-2.5 py-1 rounded-lg text-sm border border-line text-red-700 hover:bg-red-500/10 transition-colors"
      @click="theme.deleteTheme(theme.activeThemeId)"
    >
      Delete
    </button>
    <button
      v-if="!theme.isActiveBuiltIn"
      type="button"
      class="px-2.5 py-1 rounded-lg text-sm border border-line bg-surface hover:bg-line/40 transition-colors"
      @click="theme.resetThemeToDefault(theme.activeThemeId)"
    >
      Reset to {{ baseName() }}
    </button>
    <button
      type="button"
      class="ml-auto px-4 py-1.5 rounded-lg bg-action text-white text-sm font-medium hover:bg-action-deep transition-colors"
      @click="emit('close')"
    >
      Done
    </button>
  </div>
</template>
