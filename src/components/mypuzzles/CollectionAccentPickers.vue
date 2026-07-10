<script setup lang="ts">
import type {
  CollectionAccentColorEnum, CollectionBgTreatmentEnum, CollectionTitleFontEnum,
} from '@/graphql/generated/types'
import { ACCENT_OPTIONS, BG_OPTIONS, FONT_OPTIONS } from '@/utils/collectionTheme'

// The three curated accent pickers for a collection page (swatches +
// background + title font). Emits one save per pick, same shape as the other
// collection settings.
defineProps<{
  accentColor: CollectionAccentColorEnum
  bgTreatment: CollectionBgTreatmentEnum
  titleFont: CollectionTitleFontEnum
}>()
const emit = defineEmits<{
  save: [attrs: {
    accentColor?: CollectionAccentColorEnum
    bgTreatment?: CollectionBgTreatmentEnum
    titleFont?: CollectionTitleFontEnum
  }]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-x-6 gap-y-3">
    <div class="flex flex-col gap-1.5">
      <span class="text-sm text-soft">Accent</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="option in ACCENT_OPTIONS"
          :key="option.value"
          type="button"
          class="w-7 h-7 rounded-full border-2"
          :class="option.value === accentColor ? 'border-ink-text' : 'border-transparent'"
          :style="{ background: option.swatch }"
          :title="option.label"
          :aria-label="`${option.label} accent`"
          :aria-pressed="option.value === accentColor"
          @click="emit('save', { accentColor: option.value })"
        />
      </div>
    </div>
    <label class="text-sm text-soft flex flex-col gap-1.5">
      Background
      <select
        :value="bgTreatment"
        class="text-sm px-2 py-1 rounded border border-line bg-surface"
        @change="emit('save', { bgTreatment: ($event.target as HTMLSelectElement).value as CollectionBgTreatmentEnum })"
      >
        <option
          v-for="option in BG_OPTIONS"
          :key="option.value"
          :value="option.value"
        >{{ option.label }}</option>
      </select>
    </label>
    <label class="text-sm text-soft flex flex-col gap-1.5">
      Title font
      <select
        :value="titleFont"
        class="text-sm px-2 py-1 rounded border border-line bg-surface"
        @change="emit('save', { titleFont: ($event.target as HTMLSelectElement).value as CollectionTitleFontEnum })"
      >
        <option
          v-for="option in FONT_OPTIONS"
          :key="option.value"
          :value="option.value"
        >{{ option.label }}</option>
      </select>
    </label>
  </div>
</template>
