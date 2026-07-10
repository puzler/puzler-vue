<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { enabledExtraModes, extraToolClass, centerToolInStrip } from './numpadModes'
import MdiIcon from '@/components/MdiIcon.vue'

// Desktop optional-tools shelf: an inset, full-bleed strip above the numpad
// (the side panel constrains width, so overflow scrolls horizontally). The
// scrollbar is hidden; a mouse drag pans the shelf like touch scrolling.
// Mobile uses NumpadExtraToolsRail instead. Renders nothing when no extra
// tool is enabled.

const editor = useEditorStore()
const grid = useGridStore()
const player = usePlayerSettingsStore()

const extraModes = computed(() => enabledExtraModes(player.settings, grid))

const strip = ref<HTMLElement | null>(null)

// Cycling with B (or clicking a half-visible key) centers the active tool so
// the user can see where they are and what comes next.
watch(() => editor.inputMode, (mode) => {
  const idx = extraModes.value.findIndex((m) => m.mode === mode)
  if (idx === -1 || !strip.value) return
  const btn = strip.value.querySelectorAll('button')[idx]
  if (btn) centerToolInStrip(strip.value, btn, 'x')
})

// Mouse drag-to-scroll. Touch pointers keep the native scroll behavior; for
// the mouse we pan scrollLeft ourselves, and once a drag passes the slop the
// button click on release is swallowed so panning never activates a tool.
// Pointer capture waits for the slop too: capturing on pointerdown would
// retarget the pointerup to the strip, so the browser would synthesize the
// click on the strip instead of the pressed button and plain clicks would die.
const DRAG_SLOP = 4
let drag: { startX: number; startScroll: number; moved: boolean } | null = null

function onPointerDown(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || !strip.value) return
  drag = { startX: e.clientX, startScroll: strip.value.scrollLeft, moved: false }
}

function onPointerMove(e: PointerEvent) {
  if (!drag || !strip.value) return
  const dx = e.clientX - drag.startX
  if (!drag.moved && Math.abs(dx) > DRAG_SLOP) {
    drag.moved = true
    strip.value.setPointerCapture?.(e.pointerId)
  }
  if (drag.moved) strip.value.scrollLeft = drag.startScroll - dx
}

function onPointerUp(e: PointerEvent) {
  if (!drag) return
  strip.value?.releasePointerCapture?.(e.pointerId)
  // `drag` survives until the click that follows pointerup (see onClickCapture).
}

function onClickCapture(e: MouseEvent) {
  if (drag?.moved) {
    e.preventDefault()
    e.stopPropagation()
  }
  drag = null
}
</script>

<template>
  <div
    v-if="extraModes.length"
    ref="strip"
    class="hidden md:flex gap-1.5 overflow-x-auto no-scrollbar inset-shadow-y select-none -mx-4 -mt-4 px-4 py-2 bg-canvas border-b border-line"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="drag = null"
    @click.capture="onClickCapture"
  >
    <button
      v-for="m in extraModes"
      :key="m.mode"
      :title="m.title"
      :aria-label="m.label"
      :class="['shrink-0 w-10 h-10 rounded-lg border shadow-sm flex items-center justify-center transition-colors', extraToolClass(editor.effectiveInputMode === m.mode)]"
      @click="editor.setInputMode(m.mode)"
    >
      <MdiIcon
        :path="m.icon"
        :size="20"
      />
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
/* Recessed-shelf shading on the horizontal edges only (the sides stay open
   where the strip scrolls). Fixed to the box, so content scrolls under it. */
.inset-shadow-y {
  box-shadow:
    inset 0 3px 4px -2px rgb(0 0 0 / 0.12),
    inset 0 -3px 4px -2px rgb(0 0 0 / 0.12);
}
</style>
