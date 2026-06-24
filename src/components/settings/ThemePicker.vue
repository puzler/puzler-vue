<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import ThemePreview from './ThemePreview.vue'

// Visual theme gallery: each theme is a live mini-preview card; click to activate. Plus a card
// to spin up a new theme from the active one.
const theme = useThemeStore()
</script>

<template>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
    <button
      v-for="t in theme.allThemes"
      :key="t.id"
      type="button"
      class="rounded-xl border-2 p-1.5 text-left transition-colors"
      :class="theme.activeThemeId === t.id ? 'border-action' : 'border-line hover:border-soft'"
      @click="theme.setActiveTheme(t.id)"
    >
      <ThemePreview
        :theme="t"
        focus="overview"
      />
      <p class="mt-1 px-0.5 text-xs text-ink-text truncate">
        {{ t.name }}
      </p>
    </button>
    <button
      type="button"
      class="min-h-[92px] rounded-xl border-2 border-dashed border-line text-soft hover:border-action hover:text-action flex flex-col items-center justify-center gap-1 transition-colors"
      @click="theme.createThemeFrom(theme.activeThemeId)"
    >
      <span class="text-2xl leading-none">+</span>
      <span class="text-xs">New theme</span>
    </button>
  </div>
</template>
