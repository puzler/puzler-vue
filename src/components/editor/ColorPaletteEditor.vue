<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { mdiPlus } from '@mdi/js'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { parseRgb, MAX_PAGES } from '@/utils/colorPalette'
import MdiIcon from '@/components/MdiIcon.vue'
import PalettePageActions from './PalettePageActions.vue'

const palette = useColorPaletteStore()
const emit = defineEmits<{ close: [] }>()

// Index (0-9) of the swatch being edited on the current page.
const selected = ref(0)

const selectedKey = computed(() => palette.currentPageKeys[selected.value] ?? '')
const selectedColor = computed(() => palette.swatchForKey(selectedKey.value))

function rgbToHex(input: string | undefined): string {
  const c = parseRgb(input)
  if (!c) return '#ffffff'
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(c.red)}${h(c.green)}${h(c.blue)}`
}

const selectedHex = computed(() => rgbToHex(selectedColor.value))
const selectedAlpha = computed(() => parseRgb(selectedColor.value)?.opacity ?? 1)

// Commit on the controls' `change` (release), not live `input`, so one edit is
// one persisted change. Stored as rgb() when opaque, rgba() when translucent.
function commit(hex: string, alpha: number) {
  const c = parseRgb(hex)
  if (!c || !selectedKey.value) return
  const a = Math.max(0, Math.min(1, alpha))
  const value = a >= 1
    ? `rgb(${c.red}, ${c.green}, ${c.blue})`
    : `rgba(${c.red}, ${c.green}, ${c.blue}, ${a})`
  palette.setColor(selectedKey.value, value)
}
function onPick(event: Event) {
  commit((event.target as HTMLInputElement).value, selectedAlpha.value)
}
function onAlpha(event: Event) {
  commit(selectedHex.value, parseFloat((event.target as HTMLInputElement).value))
}

function swatchBg(index: number): string {
  const key = palette.currentPageKeys[index]
  return key ? palette.swatchBackground(key) : ''
}

// Keep the selected swatch valid when the active page changes.
watch(() => palette.pageIndex, () => { selected.value = 0 })
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="font-display text-base font-semibold text-ink-text">
            Edit colours
          </h3>
          <button
            class="text-faint hover:text-soft text-xl leading-none"
            aria-label="Close"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <!-- Page tabs -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            v-for="i in palette.pageCount"
            :key="i"
            class="px-3 py-1 rounded-lg text-sm transition-colors"
            :class="palette.pageIndex === i - 1
              ? 'bg-action-tint text-action font-medium'
              : 'text-soft hover:bg-paper'"
            @click="palette.setPageIndex(i - 1)"
          >
            Page {{ i }}
          </button>
          <button
            v-if="palette.pageCount < MAX_PAGES"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-soft hover:bg-action-tint hover:text-action transition-colors"
            title="New page"
            aria-label="New color page"
            @click="palette.newPage()"
          >
            <MdiIcon
              :path="mdiPlus"
              :size="18"
            />
          </button>
        </div>

        <!-- Swatch grid for the active page -->
        <div class="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2">
          <button
            v-for="(key, i) in palette.currentPageKeys"
            :key="key"
            class="aspect-square rounded-lg border-2 shadow-sm transition-transform"
            :class="selected === i ? 'border-action scale-105' : 'border-line hover:border-soft'"
            :style="{ background: swatchBg(i) }"
            :title="`Colour ${i}`"
            @click="selected = i"
          />
        </div>

        <!-- Selected colour editor: hue picker + opacity slider -->
        <div class="flex flex-col gap-2.5 rounded-lg bg-paper p-3">
          <div class="flex items-center gap-3">
            <input
              type="color"
              class="w-10 h-10 rounded border border-line bg-surface cursor-pointer"
              :value="selectedHex"
              aria-label="Colour"
              @change="onPick"
            >
            <span class="font-mono text-xs text-soft uppercase">{{ selectedHex }}</span>
            <span class="ml-auto text-xs text-faint">
              Colour {{ selected }} · page {{ palette.pageIndex + 1 }}
            </span>
          </div>
          <label class="flex items-center gap-2">
            <span class="text-xs text-soft w-14 shrink-0">Opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="flex-1 accent-action"
              :value="selectedAlpha"
              aria-label="Opacity"
              @change="onAlpha"
            >
            <span class="font-mono text-xs text-soft w-9 text-right tabular-nums">{{ Math.round(selectedAlpha * 100) }}%</span>
          </label>
        </div>

        <PalettePageActions @close="emit('close')" />
      </div>
    </div>
  </Teleport>
</template>
