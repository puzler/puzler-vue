<script setup lang="ts">
import { ref } from 'vue'
import { mdiLinkVariant, mdiLinkVariantOff } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import BaseModal from '@/components/ui/BaseModal.vue'
import SpinnerChevronButton from './SpinnerChevronButton.vue'

const emit = defineEmits<{ close: [] }>()

const editor = useEditorStore()
const grid = useGridStore()

// Width = columns, height = rows. Linked (the default) keeps them equal via a
// single spinner; unlinking swaps in per-dimension spinners for rectangular
// grids. UI state only — the created grid is just (rows, cols).
const pendingWidth = ref(grid.cols)
const pendingHeight = ref(grid.rows)
const linked = ref(true)

function open() {
  pendingWidth.value = grid.cols
  pendingHeight.value = grid.rows
  linked.value = grid.rows === grid.cols
}

function toggleLinked() {
  linked.value = !linked.value
  if (linked.value) pendingHeight.value = pendingWidth.value
}

function bumpLinked(delta: number) {
  pendingWidth.value += delta
  pendingHeight.value = pendingWidth.value
}

function bump(dim: 'width' | 'height', delta: number) {
  if (dim === 'width') pendingWidth.value += delta
  else pendingHeight.value += delta
}

function confirm() {
  grid.setDimensions(pendingHeight.value, pendingWidth.value)
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
    <div
      v-if="linked"
      class="flex items-center gap-3"
    >
      <SpinnerChevronButton
        direction="left"
        :disabled="pendingWidth <= 2"
        label="Smaller grid"
        @click="bumpLinked(-1)"
      />
      <span class="w-14 text-center text-lg font-semibold text-ink-text tabular-nums">
        {{ pendingWidth }}×{{ pendingHeight }}
      </span>
      <SpinnerChevronButton
        direction="right"
        :disabled="pendingWidth >= 16"
        label="Larger grid"
        @click="bumpLinked(1)"
      />
    </div>

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
          :disabled="(dim === 'width' ? pendingWidth : pendingHeight) >= 16"
          :label="`Increase ${dim}`"
          @click="bump(dim, 1)"
        />
        <span class="w-10 text-center text-lg font-semibold text-ink-text tabular-nums">
          {{ dim === 'width' ? pendingWidth : pendingHeight }}
        </span>
        <SpinnerChevronButton
          direction="down"
          :disabled="(dim === 'width' ? pendingWidth : pendingHeight) <= 2"
          :label="`Decrease ${dim}`"
          @click="bump(dim, -1)"
        />
        <span class="text-[10px] font-semibold uppercase tracking-widest text-soft">
          {{ dim }}
        </span>
      </div>
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
