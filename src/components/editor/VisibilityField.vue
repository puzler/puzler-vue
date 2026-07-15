<script setup lang="ts">
import { computed } from 'vue'
import { PuzzleVisibilityEnum } from '@/graphql/generated/types'

// The access modes as a radio group. Shared by the editor's Publish modal and
// the puzzle page's Manage modal. `allowPatrons` (Patreon creators only, per
// the auth store) appends the Patrons mode — this component stays store-free.
const model = defineModel<PuzzleVisibilityEnum>({ required: true })

const props = defineProps<{ allowPatrons?: boolean }>()

const BASE_MODES = [
  { value: PuzzleVisibilityEnum.Private, label: 'Private', hint: 'Only you and people you invite' },
  { value: PuzzleVisibilityEnum.Unlisted, label: 'Unlisted', hint: 'Anyone with the link, not in the archive' },
  { value: PuzzleVisibilityEnum.ContainersOnly, label: 'Collections & series only', hint: 'Hidden from the archive; shown inside your collections and series' },
  { value: PuzzleVisibilityEnum.Public, label: 'Public', hint: 'Listed in the archive for everyone' },
] as const

const PATRON_MODE = {
  value: PuzzleVisibilityEnum.PatronsOnly,
  label: 'Patrons',
  hint: 'Only your Patreon patrons, per the tier you choose',
} as const

const modes = computed(() =>
  props.allowPatrons || model.value === PuzzleVisibilityEnum.PatronsOnly
    ? [ ...BASE_MODES, PATRON_MODE ]
    : BASE_MODES,
)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-for="mode in modes"
      :key="mode.value"
      class="flex items-start gap-2 px-3 py-2 rounded-xl border cursor-pointer"
      :class="model === mode.value ? 'border-action bg-action-tint' : 'border-line'"
    >
      <input
        v-model="model"
        type="radio"
        :value="mode.value"
        class="mt-1"
      >
      <span class="flex flex-col">
        <span class="text-sm font-medium text-ink-text">{{ mode.label }}</span>
        <span class="text-xs text-faint">{{ mode.hint }}</span>
      </span>
    </label>
  </div>
</template>
