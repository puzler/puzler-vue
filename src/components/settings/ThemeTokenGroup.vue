<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { parseRgb } from '@/utils/colorPalette'
import { getBuiltInTheme } from '@/utils/themePresets'
import type { ChromeTokenKey, GridTokenKey } from '@/utils/theme'

const props = defineProps<{
  title: string
  subtitle: string
  group: 'chrome' | 'grid'
  tokens: { key: string; label: string; default: string }[]
}>()

const theme = useThemeStore()

function toHex(value: string): string {
  const c = parseRgb(value)
  if (!c) return '#000000'
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(c.red)}${h(c.green)}${h(c.blue)}`
}

const overrides = (): Record<string, string | undefined> =>
  (props.group === 'chrome' ? theme.activeTheme.appearance.chrome : theme.activeTheme.appearance.grid)

// The base preset's value for a token — what an un-set token shows and what Reset falls back to.
// Falls through to the static `default` (Classic) when the base preset leaves the token unset.
const baseVal = (key: string): string | undefined => {
  const a = getBuiltInTheme(theme.activeTheme.basePresetId)?.appearance
  return props.group === 'chrome' ? a?.chrome[key as ChromeTokenKey] : a?.grid[key as GridTokenKey]
}

const hexFor = (tok: { key: string; default: string }) => toHex(overrides()[tok.key] ?? baseVal(tok.key) ?? tok.default)
const isSet = (key: string) => overrides()[key] !== undefined

function set(key: string, value: string | null) {
  if (props.group === 'chrome') theme.updateChromeToken(theme.activeThemeId, key as ChromeTokenKey, value)
  else theme.updateGridToken(theme.activeThemeId, key as GridTokenKey, value)
}
</script>

<template>
  <div class="mb-5">
    <h3 class="font-display text-sm font-semibold text-ink-text mb-1">
      {{ title }}
    </h3>
    <p class="text-xs text-faint mb-2">
      {{ subtitle }}
    </p>
    <div
      v-for="tok in tokens"
      :key="tok.key"
      class="flex items-center gap-3 py-1"
    >
      <input
        type="color"
        class="w-8 h-8 rounded border border-line bg-surface cursor-pointer shrink-0"
        :value="hexFor(tok)"
        :aria-label="tok.label"
        @change="(e) => set(tok.key, (e.target as HTMLInputElement).value)"
      >
      <span class="text-sm text-ink-text">{{ tok.label }}</span>
      <span class="ml-auto font-mono text-xs text-faint uppercase">{{ hexFor(tok) }}</span>
      <button
        v-if="isSet(tok.key)"
        type="button"
        class="text-xs text-faint hover:text-action transition-colors"
        title="Reset to default"
        @click="set(tok.key, null)"
      >
        Reset
      </button>
    </div>
  </div>
</template>
