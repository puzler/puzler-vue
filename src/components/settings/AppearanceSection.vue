<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import ThemePicker from './ThemePicker.vue'
import ThemeEditorModal from './ThemeEditorModal.vue'

const theme = useThemeStore()
const showEditor = ref(false)
</script>

<template>
  <section class="bg-paper border border-line rounded-xl p-6">
    <h2 class="font-display text-lg font-semibold mb-1">
      Appearance
    </h2>
    <p class="text-sm text-soft mb-4">
      Pick a theme or build your own. Changes apply across the site instantly and follow your account.
    </p>

    <button
      type="button"
      role="switch"
      :aria-checked="theme.enableCustomStyles"
      aria-label="Enable custom styles"
      class="flex items-center gap-3 py-2 mb-4 w-full text-left border-y border-line"
      @click="theme.setEnableCustomStyles(!theme.enableCustomStyles)"
    >
      <span class="flex-1 min-w-0">
        <span class="block text-sm text-ink-text">Enable custom styles</span>
        <span class="block text-xs text-faint leading-snug">Apply your theme to the grid. Turn off to see a puzzle’s intended colours (chrome stays themed).</span>
      </span>
      <span
        class="shrink-0 w-9 h-5 rounded-full p-0.5 flex transition-colors"
        :class="theme.enableCustomStyles ? 'bg-action' : 'bg-line'"
      >
        <span
          class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
          :class="theme.enableCustomStyles ? 'translate-x-4' : 'translate-x-0'"
        />
      </span>
    </button>

    <ThemePicker class="mb-4" />

    <button
      type="button"
      class="px-4 py-2 rounded-lg text-sm bg-action text-white font-medium hover:bg-action-deep transition-colors"
      @click="showEditor = true"
    >
      Edit theme styles
    </button>

    <ThemeEditorModal
      v-if="showEditor"
      @close="showEditor = false"
    />
  </section>
</template>
