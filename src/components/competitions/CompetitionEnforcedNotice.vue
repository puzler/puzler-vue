<script setup lang="ts">
import { computed } from 'vue'
import { normalizeEnforced } from '@/utils/playerSettings'
import { settingLabel } from '@/utils/playerSettingMeta'

// Competitors see the setting rules before they commit their one attempt:
// which player settings the author forces on or off, plus the standing
// collaboration ban. Rendered pre-run under the how-it-works card.
const props = defineProps<{ enforcedSettings: unknown }>()

const rules = computed(() =>
  Object.entries(normalizeEnforced(props.enforcedSettings))
    .map(([ key, value ]) => ({ key, label: settingLabel(key), on: value })))
</script>

<template>
  <section class="mt-3 rounded-xl border border-line bg-surface p-4 flex flex-col gap-2">
    <h2 class="text-[11px] font-semibold uppercase tracking-widest text-soft">
      Setting rules during this competition
    </h2>
    <ul class="text-sm text-ink-text flex flex-col gap-1">
      <li
        v-for="rule in rules"
        :key="rule.key"
        class="flex items-center gap-2"
      >
        <span
          class="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
          :class="rule.on ? 'bg-action-tint text-action' : 'bg-line text-soft'"
        >{{ rule.on ? 'ON' : 'OFF' }}</span>
        {{ rule.label }}
      </li>
      <li class="flex items-center gap-2">
        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-line text-soft">OFF</span>
        Collaboration (always disabled in competitions)
      </li>
    </ul>
    <p
      v-if="rules.length"
      class="text-xs text-faint"
    >
      Everything not listed stays your choice, as in your normal settings.
    </p>
  </section>
</template>
