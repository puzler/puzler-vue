<script setup lang="ts">
import { mdiChevronLeft, mdiChevronRight, mdiContentCopy, mdiTrashCanOutline } from '@mdi/js'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { MAX_PAGES } from '@/utils/colorPalette'
import MdiIcon from '@/components/MdiIcon.vue'

const palette = useColorPaletteStore()
const emit = defineEmits<{ close: [] }>()

const ACTION = 'w-8 h-8 flex items-center justify-center rounded-lg text-soft hover:bg-action-tint hover:text-action disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-soft transition-colors'

// Reorder the current page and follow it, so the active tab tracks the moved
// page rather than appearing to swap colours in place.
function movePage(dir: -1 | 1) {
  const i = palette.pageIndex
  const moved = dir < 0 ? palette.movePageLeft(i) : palette.movePageRight(i)
  if (moved) palette.setPageIndex(i + dir)
}
</script>

<template>
  <div class="flex items-center gap-1 border-t border-line pt-3">
    <button
      :class="ACTION"
      title="Move page left"
      aria-label="Move page left"
      :disabled="palette.pageIndex === 0"
      @click="movePage(-1)"
    >
      <MdiIcon
        :path="mdiChevronLeft"
        :size="18"
      />
    </button>
    <button
      :class="ACTION"
      title="Move page right"
      aria-label="Move page right"
      :disabled="palette.pageIndex >= palette.pageCount - 1"
      @click="movePage(1)"
    >
      <MdiIcon
        :path="mdiChevronRight"
        :size="18"
      />
    </button>
    <button
      :class="ACTION"
      title="Duplicate page"
      aria-label="Duplicate page"
      :disabled="palette.pageCount >= MAX_PAGES"
      @click="palette.duplicatePage(palette.pageIndex)"
    >
      <MdiIcon
        :path="mdiContentCopy"
        :size="16"
      />
    </button>
    <button
      class="w-8 h-8 flex items-center justify-center rounded-lg text-soft hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-soft transition-colors"
      title="Delete page"
      aria-label="Delete page"
      :disabled="palette.pageCount <= 1"
      @click="palette.deletePage(palette.pageIndex)"
    >
      <MdiIcon
        :path="mdiTrashCanOutline"
        :size="16"
      />
    </button>
    <button
      class="ml-auto px-4 py-1.5 rounded-lg text-sm bg-action text-on-action hover:bg-action-deep transition-colors"
      @click="emit('close')"
    >
      Done
    </button>
  </div>
</template>
