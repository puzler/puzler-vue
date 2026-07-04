<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiChevronUp, mdiChevronDown, mdiChevronLeft, mdiChevronRight, mdiRotateLeft, mdiRotateRight } from '@mdi/js'

const editor = useEditorStore()

// Half a cell per press: snaps the selected object across centres, edges and
// corners, and can travel arbitrarily far outside the grid.
const STEP = 0.5
// Coarse and fine rotation steps per press, in degrees.
const ROTATE_STEPS = [-45, -15, 15, 45]
const BTN = 'w-8 h-8 flex items-center justify-center rounded-md border border-line text-soft hover:text-action hover:border-action transition-colors'

const rotation = computed(() => {
  const inst = editor.selectedCosmetic
  if (!inst) return 0
  return (inst.data as { rotation?: number }).rotation ?? 0
})

function onRotationChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(raw)) editor.setSelectedCosmeticRotation(raw)
}
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
      <div class="flex items-center gap-1">
        <button
          v-for="step in ROTATE_STEPS"
          :key="step"
          class="w-7 h-7 flex items-center justify-center gap-px rounded-md border border-line text-soft hover:text-action hover:border-action transition-colors text-[10px] tabular-nums"
          :aria-label="`Rotate ${Math.abs(step)}° ${step < 0 ? 'counter-clockwise' : 'clockwise'}`"
          @click="editor.rotateSelectedCosmetic(step)"
        >
          <MdiIcon
            :path="step < 0 ? mdiRotateLeft : mdiRotateRight"
            :size="12"
          />
          {{ Math.abs(step) }}
        </button>
      </div>
      <div class="flex items-center gap-1">
        <input
          type="number"
          :value="rotation"
          class="w-16 text-sm px-2 py-1 rounded border border-line focus:outline-none focus:border-action text-center"
          aria-label="Rotation in degrees"
          @change="onRotationChange"
        >
        <span class="text-xs text-faint">°</span>
      </div>
    </div>
  </div>
</template>
