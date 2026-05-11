<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import NewGridModal from './NewGridModal.vue'
import ExportModal from './ExportModal.vue'

const editor = useEditorStore()

const showNewGrid = ref(false)
const showExport = ref(false)
const newGridModal = ref<InstanceType<typeof NewGridModal> | null>(null)

function openNewGrid() {
  showNewGrid.value = true
  newGridModal.value?.open()
}
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
    <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
      <button
        class="px-3 py-1.5 transition-colors"
        :class="editor.mode === 'setting' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'"
        @click="editor.setMode('setting')"
      >
        Setting
      </button>
      <button
        class="px-3 py-1.5 border-l border-gray-200 transition-colors"
        :class="editor.mode === 'solving' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'"
        @click="editor.setMode('solving')"
      >
        Solving
      </button>
    </div>

    <div class="w-px h-5 bg-gray-200" />

    <div class="flex-1 flex justify-center gap-2">
      <button
        class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        @click="openNewGrid"
      >
        New Grid
      </button>
      <button
        class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        @click="editor.clearSolverState()"
      >
        Clear
      </button>
    </div>

    <button
      class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      @click="showExport = true"
    >
      Export
    </button>
    <button class="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors">
      Save
    </button>
  </div>

  <NewGridModal
    v-if="showNewGrid"
    ref="newGridModal"
    @close="showNewGrid = false"
  />
  <ExportModal
    v-if="showExport"
    @close="showExport = false"
  />
</template>
