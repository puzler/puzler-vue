<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

const emit = defineEmits<{ close: [] }>()

const editor = useEditorStore()
const grid = useGridStore()

const pendingSize = ref(grid.rows)

function open() {
  pendingSize.value = grid.rows
}

function confirm() {
  grid.setDimensions(pendingSize.value, pendingSize.value)
  editor.reset()
  emit('close')
}

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 w-56 flex flex-col items-center gap-5">
        <span class="text-sm font-semibold text-gray-700">New Grid</span>

        <div class="flex items-center gap-3">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            :disabled="pendingSize <= 2"
            @click="pendingSize--"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span class="w-14 text-center text-lg font-semibold text-gray-800 tabular-nums">
            {{ pendingSize }}×{{ pendingSize }}
          </span>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            :disabled="pendingSize >= 16"
            @click="pendingSize++"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <button
          class="w-full py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
          @click="confirm"
        >
          Create
        </button>
      </div>
    </div>
  </Teleport>
</template>
