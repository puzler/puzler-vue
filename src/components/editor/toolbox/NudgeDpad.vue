<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiChevronUp, mdiChevronDown, mdiChevronLeft, mdiChevronRight, mdiRotateLeft, mdiRotateRight } from '@mdi/js'

const editor = useEditorStore()

// Half a cell per press: snaps the selected object across centres, edges and
// corners, and can travel arbitrarily far outside the grid.
const STEP = 0.5
// Each press rotates the selected object 45° in that direction.
const ROTATE_STEP = 45
const BTN = 'w-8 h-8 flex items-center justify-center rounded-md border border-line text-soft hover:text-action hover:border-action transition-colors'

const rotation = computed(() => {
  const inst = editor.selectedCosmetic
  if (!inst) return 0
  return (inst.data as { rotation?: number }).rotation ?? 0
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="flex flex-col items-center gap-1">
      <span class="text-[10px] uppercase tracking-widest text-faint">Nudge</span>
      <div class="grid grid-cols-3 gap-1">
        <div />
        <button
          :class="BTN"
          aria-label="Nudge up"
          @click="editor.nudgeSelectedCosmetic(0, -STEP)"
        >
          <MdiIcon
            :path="mdiChevronUp"
            :size="18"
          />
        </button>
        <div />
        <button
          :class="BTN"
          aria-label="Nudge left"
          @click="editor.nudgeSelectedCosmetic(-STEP, 0)"
        >
          <MdiIcon
            :path="mdiChevronLeft"
            :size="18"
          />
        </button>
        <div />
        <button
          :class="BTN"
          aria-label="Nudge right"
          @click="editor.nudgeSelectedCosmetic(STEP, 0)"
        >
          <MdiIcon
            :path="mdiChevronRight"
            :size="18"
          />
        </button>
        <div />
        <button
          :class="BTN"
          aria-label="Nudge down"
          @click="editor.nudgeSelectedCosmetic(0, STEP)"
        >
          <MdiIcon
            :path="mdiChevronDown"
            :size="18"
          />
        </button>
        <div />
      </div>
    </div>

    <div class="flex flex-col items-center gap-1">
      <span class="text-[10px] uppercase tracking-widest text-faint">Rotate</span>
      <div class="flex items-center gap-2">
        <button
          :class="BTN"
          aria-label="Rotate counter-clockwise"
          @click="editor.rotateSelectedCosmetic(-ROTATE_STEP)"
        >
          <MdiIcon
            :path="mdiRotateLeft"
            :size="18"
          />
        </button>
        <span class="w-9 text-center text-xs text-faint tabular-nums">{{ rotation }}°</span>
        <button
          :class="BTN"
          aria-label="Rotate clockwise"
          @click="editor.rotateSelectedCosmetic(ROTATE_STEP)"
        >
          <MdiIcon
            :path="mdiRotateRight"
            :size="18"
          />
        </button>
      </div>
    </div>
  </div>
</template>
