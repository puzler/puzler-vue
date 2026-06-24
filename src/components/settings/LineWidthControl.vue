<script setup lang="ts">
import { useFullLineControl } from '@/composables/useFullLineControl'

// Line stroke width: a friendly Thin/Normal/Thick segmented control by default, or the raw
// numeric slider when "Full line control" is on (a shared UI pref toggled in the modal header).
defineProps<{ value: number }>()
const emit = defineEmits<{ update: [value: number] }>()

const full = useFullLineControl()
const PRESETS = [{ label: 'Thin', v: 4 }, { label: 'Normal', v: 8 }, { label: 'Thick', v: 14 }]
</script>

<template>
  <div class="flex items-center gap-2">
    <template v-if="!full">
      <button
        v-for="p in PRESETS"
        :key="p.v"
        type="button"
        class="px-2.5 py-1 rounded-md text-xs border transition-colors"
        :class="Math.round(value) === p.v
          ? 'border-action bg-action-tint text-action font-medium'
          : 'border-line text-soft hover:border-soft'"
        @click="emit('update', p.v)"
      >
        {{ p.label }}
      </button>
    </template>
    <template v-else>
      <input
        type="range"
        min="1"
        max="24"
        step="1"
        class="flex-1 accent-action"
        :value="value"
        aria-label="Line width"
        @change="emit('update', Number(($event.target as HTMLInputElement).value))"
      >
      <span class="font-mono text-xs text-soft w-6 text-right tabular-nums">{{ Math.round(value) }}</span>
    </template>
  </div>
</template>
