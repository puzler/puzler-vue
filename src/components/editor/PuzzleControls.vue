<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiViewGridPlusOutline, mdiEraser } from '@mdi/js'
import NewGridModal from './NewGridModal.vue'
import EditorActions from './EditorActions.vue'

const editor = useEditorStore()

const showNewGrid = ref(false)
const newGridModal = ref<InstanceType<typeof NewGridModal> | null>(null)

const ICON_BTN = 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-line text-soft hover:text-action hover:border-action transition-colors'
const ICON_BTN_DANGER = 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-line text-soft hover:text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors'

function openNewGrid() {
  showNewGrid.value = true
  newGridModal.value?.open()
}

function toggleMode() {
  editor.setMode(editor.mode === 'setting' ? 'solving' : 'setting')
}
</script>

<template>
  <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 border-b border-line bg-paper shrink-0">
    <div class="flex items-center gap-1.5">
      <button
        title="New grid"
        aria-label="New grid"
        :class="ICON_BTN"
        @click="openNewGrid"
      >
        <MdiIcon
          :path="mdiViewGridPlusOutline"
          :size="18"
        />
      </button>
      <button
        title="Clear"
        aria-label="Clear"
        :class="ICON_BTN_DANGER"
        @click="editor.clearSolverState()"
      >
        <MdiIcon
          :path="mdiEraser"
          :size="18"
        />
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="w-14 text-right text-sm transition-colors"
        :class="editor.mode === 'setting' ? 'text-ink-text font-semibold' : 'text-soft hover:text-ink-text'"
        @click="editor.setMode('setting')"
      >
        Setting
      </button>
      <button
        role="switch"
        :aria-checked="editor.mode === 'solving'"
        aria-label="Toggle between setting and solving"
        class="relative w-11 h-6 rounded-full bg-action hover:bg-action-deep transition-colors"
        @click="toggleMode"
      >
        <span
          class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out"
          :class="{ 'translate-x-5': editor.mode === 'solving' }"
        />
      </button>
      <button
        class="w-14 text-left text-sm transition-colors"
        :class="editor.mode === 'solving' ? 'text-ink-text font-semibold' : 'text-soft hover:text-ink-text'"
        @click="editor.setMode('solving')"
      >
        Solving
      </button>
    </div>

    <EditorActions />
  </div>

  <NewGridModal
    v-if="showNewGrid"
    ref="newGridModal"
    @close="showNewGrid = false"
  />
</template>
