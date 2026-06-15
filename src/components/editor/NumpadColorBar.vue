<script setup lang="ts">
import { ref } from 'vue'
import { mdiPalette, mdiChevronLeft, mdiChevronRight } from '@mdi/js'
import { useColorPaletteStore } from '@/stores/colorPalette'
import MdiIcon from '@/components/MdiIcon.vue'
import ColorPaletteEditor from './ColorPaletteEditor.vue'

// Page navigation (dots + prev/next) and the palette-editor launcher, shown
// beneath the swatches while the numpad is in colour mode.
const palette = useColorPaletteStore()
const showPaletteEditor = ref(false)

const NAV_BTN = 'w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-soft hover:bg-action-tint hover:text-action transition-colors'
</script>

<template>
  <div class="w-full max-w-[14rem] md:max-w-none mx-auto flex items-center gap-1">
    <template v-if="palette.pageCount > 1">
      <button
        :class="NAV_BTN"
        title="Previous page"
        aria-label="Previous color page"
        @click="palette.setPageIndex((palette.pageIndex - 1 + palette.pageCount) % palette.pageCount)"
      >
        <MdiIcon
          :path="mdiChevronLeft"
          :size="18"
        />
      </button>
      <div class="flex-1 flex items-center justify-center gap-1">
        <button
          v-for="i in palette.pageCount"
          :key="i"
          class="w-2 h-2 rounded-full transition-colors"
          :class="palette.pageIndex === i - 1 ? 'bg-action' : 'bg-line hover:bg-soft'"
          :title="`Page ${i}`"
          :aria-label="`Color page ${i}`"
          @click="palette.setPageIndex(i - 1)"
        />
      </div>
      <button
        :class="NAV_BTN"
        title="Next page"
        aria-label="Next color page"
        @click="palette.setPageIndex((palette.pageIndex + 1) % palette.pageCount)"
      >
        <MdiIcon
          :path="mdiChevronRight"
          :size="18"
        />
      </button>
    </template>
    <button
      class="ml-auto px-2 h-7 shrink-0 flex items-center gap-1 rounded-md text-xs text-soft hover:bg-action-tint hover:text-action transition-colors"
      title="Edit palette"
      @click="showPaletteEditor = true"
    >
      <MdiIcon
        :path="mdiPalette"
        :size="14"
      />
      Edit
    </button>

    <ColorPaletteEditor
      v-if="showPaletteEditor"
      @close="showPaletteEditor = false"
    />
  </div>
</template>
