<script setup lang="ts">
import { qrSvg } from '@/utils/qr'

// One puzzle on the printed hand-out: number, title, the link spelled out for
// readers plus a QR code for phones, and the SudokuPad mirror when one exists.
const props = defineProps<{
  number: number
  title: string
  url: string
  sudokupadUrl?: string | null
}>()

const qr = qrSvg(props.url)
</script>

<template>
  <div class="flex items-start gap-4 p-4 rounded-xl border border-line bg-surface break-inside-avoid">
    <!-- eslint-disable vue/no-v-html -- self-generated QR SVG markup, no user input -->
    <div
      class="w-20 h-20 shrink-0"
      v-html="qr"
    />
    <!-- eslint-enable vue/no-v-html -->
    <div class="min-w-0">
      <p class="font-display font-bold text-ink-text">
        {{ number }}. {{ title }}
      </p>
      <p class="text-xs text-soft mt-1 break-all">
        <a
          :href="url"
          class="text-action underline"
        >{{ url }}</a>
      </p>
      <p
        v-if="sudokupadUrl"
        class="text-xs text-soft mt-0.5 break-all"
      >
        SudokuPad: <a
          :href="sudokupadUrl"
          class="text-action underline"
        >{{ sudokupadUrl }}</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* qrcode-generator emits a fixed-size svg; make it fill its box. */
div :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
