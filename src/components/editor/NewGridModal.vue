<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiLinkVariant, mdiLinkVariantOff } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { defaultDigitRange } from '@/composables/useGrid'
import { GRID_MIN, GRID_MAX } from '@/utils/puzzleJson'
import BaseModal from '@/components/ui/BaseModal.vue'
import SpinnerChevronButton from './SpinnerChevronButton.vue'
import SpinnerRow from './SpinnerRow.vue'

const emit = defineEmits<{ close: [] }>()

const editor = useEditorStore()
const grid = useGridStore()

// Width = columns, height = rows. Linked (the default) keeps them equal via a
// single spinner; unlinking swaps in per-dimension spinners for rectangular
// grids. UI state only — the created grid is just (rows, cols).
const pendingWidth = ref(grid.cols)
const pendingHeight = ref(grid.rows)
const linked = ref(true)

// Grids past 9 no longer default their digit range to the grid size (the
// default caps at 9 — gattai boards use ordinary digits), so surface the
// range explicitly whenever it stops being self-evident.
const DIGIT_MAX = 16
const pendingDigits = ref(9)
const showDigits = computed(() => Math.max(pendingWidth.value, pendingHeight.value) > 9)

function open() {
  pendingWidth.value = grid.cols
  pendingHeight.value = grid.rows
  linked.value = grid.rows === grid.cols
  pendingDigits.value = grid.digits ?? defaultDigitRange(grid.rows, grid.cols)
}

function toggleLinked() {
  linked.value = !linked.value
  if (linked.value) pendingHeight.value = pendingWidth.value
}

// Clamp inside the bump too: rapid clicks can outrun the reactive `disabled`
// flush, so the buttons alone don't bound the value.
const clampDim = (n: number) => Math.min(GRID_MAX, Math.max(GRID_MIN, n))

function bumpLinked(delta: number) {
  pendingWidth.value = clampDim(pendingWidth.value + delta)
  pendingHeight.value = pendingWidth.value
}

function bump(dim: 'width' | 'height', delta: number) {
  if (dim === 'width') pendingWidth.value = clampDim(pendingWidth.value + delta)
  else pendingHeight.value = clampDim(pendingHeight.value + delta)
}

function confirm() {
  grid.setDimensions(pendingHeight.value, pendingWidth.value)
  if (showDigits.value) grid.setDigits(pendingDigits.value)
  editor.reset()
  emit('close')
}

defineExpose({ open })
</script>

<template>
  <BaseModal
    size="xs"
    card-class="p-6 items-center gap-5"
    @close="emit('close')"
  >
    <span class="text-sm font-semibold text-ink-text">New Grid</span>

    <!-- Linked: one spinner drives both dimensions. -->
    <SpinnerRow
      v-if="linked"
      :display="`${pendingWidth}×${pendingHeight}`"
      :dec-disabled="pendingWidth <= GRID_MIN"
      :inc-disabled="pendingWidth >= GRID_MAX"
      dec-label="Smaller grid"
      inc-label="Larger grid"
      @dec="bumpLinked(-1)"
      @inc="bumpLinked(1)"
    />

    <!-- Unlinked: independent width/height spinners. -->
    <div
      v-else
      class="flex items-start gap-6"
    >
      <div
        v-for="dim in (['width', 'height'] as const)"
        :key="dim"
        class="flex flex-col items-center gap-1"
      >
        <SpinnerChevronButton
          direction="up"
          :disabled="(dim === 'width' ? pendingWidth : pendingHeight) >= GRID_MAX"
          :label="`Increase ${dim}`"
          @click="bump(dim, 1)"
        />
        <span class="w-10 text-center text-lg font-semibold text-ink-text tabular-nums">
          {{ dim === 'width' ? pendingWidth : pendingHeight }}
        </span>
        <SpinnerChevronButton
          direction="down"
          :disabled="(dim === 'width' ? pendingWidth : pendingHeight) <= GRID_MIN"
          :label="`Decrease ${dim}`"
          @click="bump(dim, -1)"
        />
        <span class="text-[10px] font-semibold uppercase tracking-widest text-soft">
          {{ dim }}
        </span>
      </div>
    </div>

    <!-- Digit range, surfaced once the default (9) stops being the grid size. -->
    <div
      v-if="showDigits"
      class="flex flex-col items-center gap-1"
    >
      <SpinnerRow
        :display="`1–${pendingDigits}`"
        :dec-disabled="pendingDigits <= 2"
        :inc-disabled="pendingDigits >= DIGIT_MAX"
        dec-label="Fewer digits"
        inc-label="More digits"
        @dec="pendingDigits--"
        @inc="pendingDigits++"
      />
      <span class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Digits
      </span>
    </div>

    <button
      class="flex items-center gap-1.5 text-xs text-soft hover:text-ink-text transition-colors"
      :title="linked ? 'Unlink width and height' : 'Link width and height'"
      @click="toggleLinked"
    >
      <svg
        class="w-3.5 h-3.5"
        viewBox="0 0 24 24"
      >
        <path
          :d="linked ? mdiLinkVariant : mdiLinkVariantOff"
          fill="currentColor"
        />
      </svg>
      <span>{{ linked ? 'Linked' : 'Unlinked' }}</span>
    </button>

    <button
      class="w-full py-2 text-sm font-medium bg-action text-on-action hover:bg-action-deep rounded-lg transition-colors"
      @click="confirm"
    >
      Create
    </button>
  </BaseModal>
</template>
