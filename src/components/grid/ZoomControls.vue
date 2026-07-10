<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiPlus, mdiMinus, mdiFitToScreenOutline, mdiCursorMove, mdiMagnify, mdiChevronDown } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'
import { useViewportStore } from '@/stores/viewport'
import MdiIcon from '@/components/MdiIcon.vue'

// Floating zoom cluster overlaid on the grid corner — the one affordance that
// exists in every layout (setter and solver, desktop and mobile), doubling as
// the "you are zoomed" indicator. Buttons keep 44px touch targets on mobile
// and slim down on desktop. In setting mode it grows a hand toggle (the
// setter has no numpad Pan tool). The cluster starts collapsed everywhere —
// the grid fills its container edge to edge, so a single translucent chip is
// all that may sit near the board until the user reaches for it.

const editor = useEditorStore()
const viewport = useViewportStore()

const expanded = ref(false)

const percent = computed(() => `${Math.round(viewport.clamped.scale * 100)}%`)
const atMax = computed(() => viewport.clamped.scale >= viewport.maxScale - 0.001)

// Same active/inactive treatment as the numpad extra-tool keys.
const BASE = 'w-11 h-11 md:w-9 md:h-9 flex items-center justify-center rounded-md border disabled:opacity-35 disabled:pointer-events-none'
const btn = `${BASE} bg-surface border-line text-soft hover:border-action hover:text-action`
const handBtn = computed(() => viewport.panLock
  ? `${BASE} bg-action border-action text-on-action`
  : btn)
</script>

<template>
  <!-- Idle translucency: the corner can still clip the board when the
       container is near-square, so the cluster reads as an overlay and
       solidifies on interaction. -->
  <div
    class="absolute bottom-3 right-3 z-10 flex flex-col items-center gap-1.5 opacity-70 hover:opacity-100 focus-within:opacity-100 transition-opacity"
    @pointerdown.stop
    @dblclick.stop
  >
    <template v-if="expanded">
      <span
        v-if="viewport.zoomed"
        class="px-1.5 py-0.5 rounded text-xs tabular-nums bg-surface border border-line text-soft select-none"
      >{{ percent }}</span>
      <button
        v-if="editor.mode === 'setting'"
        type="button"
        :class="handBtn"
        title="Pan mode (drag moves the view)"
        aria-label="Pan mode"
        :aria-pressed="viewport.panLock"
        @click="viewport.panLock = !viewport.panLock"
      >
        <MdiIcon
          :path="mdiCursorMove"
          :size="18"
        />
      </button>
      <button
        type="button"
        :class="btn"
        :disabled="atMax"
        title="Zoom in (+)"
        aria-label="Zoom in"
        @click="viewport.zoomStep(1)"
      >
        <MdiIcon
          :path="mdiPlus"
          :size="18"
        />
      </button>
      <button
        type="button"
        :class="btn"
        :disabled="!viewport.zoomed"
        title="Zoom out (-)"
        aria-label="Zoom out"
        @click="viewport.zoomStep(-1)"
      >
        <MdiIcon
          :path="mdiMinus"
          :size="18"
        />
      </button>
      <button
        type="button"
        :class="btn"
        :disabled="!viewport.zoomed"
        title="Fit to view (Home)"
        aria-label="Fit to view"
        @click="viewport.reset()"
      >
        <MdiIcon
          :path="mdiFitToScreenOutline"
          :size="18"
        />
      </button>
    </template>
    <!-- Collapsed, the trigger doubles as the zoom indicator: % while zoomed. -->
    <button
      type="button"
      :class="btn"
      :title="expanded ? 'Hide zoom controls' : 'Zoom controls'"
      :aria-label="expanded ? 'Hide zoom controls' : 'Show zoom controls'"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <MdiIcon
        v-if="expanded"
        :path="mdiChevronDown"
        :size="18"
      />
      <span
        v-else-if="viewport.zoomed"
        class="text-[10px] font-semibold tabular-nums leading-none"
      >{{ percent }}</span>
      <MdiIcon
        v-else
        :path="mdiMagnify"
        :size="18"
      />
    </button>
  </div>
</template>
