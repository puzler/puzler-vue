<script setup lang="ts">
import { mdiUndo, mdiRedo, mdiCursorDefaultClickOutline } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'
import MdiIcon from '@/components/MdiIcon.vue'

const editor = useEditorStore()

// Square-cornered control buttons below the digit pad. Undo/Redo dim when there
// is nothing to do; multi-select highlights while active.
const CTRL = 'flex items-center justify-center rounded-lg border shadow-sm py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const CTRL_IDLE = 'bg-surface border-line text-soft enabled:hover:bg-action-tint enabled:hover:border-action'

function multiSelectClass(): string {
  return editor.multiSelectMode
    ? 'bg-action border-action text-white'
    : 'bg-surface border-line text-soft hover:border-action hover:text-action'
}
</script>

<template>
  <div class="grid grid-cols-3 gap-1.5">
    <button
      title="Undo"
      aria-label="Undo"
      :class="[CTRL, CTRL_IDLE]"
      :disabled="!editor.canUndo"
      @click="editor.undo()"
    >
      <MdiIcon
        :path="mdiUndo"
        :size="20"
      />
    </button>
    <button
      title="Redo"
      aria-label="Redo"
      :class="[CTRL, CTRL_IDLE]"
      :disabled="!editor.canRedo"
      @click="editor.redo()"
    >
      <MdiIcon
        :path="mdiRedo"
        :size="20"
      />
    </button>
    <button
      title="Multi-select: click cells to add/remove them without clearing the rest"
      aria-label="Multi-select"
      :aria-pressed="editor.multiSelectMode"
      :class="[CTRL, multiSelectClass()]"
      @click="editor.setMultiSelectMode(!editor.multiSelectMode)"
    >
      <MdiIcon
        :path="mdiCursorDefaultClickOutline"
        :size="20"
      />
    </button>
  </div>
</template>
