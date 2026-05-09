<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

const editor = useEditorStore()
const grid = useGridStore()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
    <!-- Setting / Solving toggle -->
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

    <!-- Grid size -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-gray-400">Size</span>
      <div class="flex gap-1">
        <button
          v-for="size in [4, 6, 9]"
          :key="size"
          class="w-8 py-1 rounded border text-sm transition-colors"
          :class="grid.rows === size
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'"
          @click="grid.setDimensions(size, size); editor.reset()"
        >
          {{ size }}
        </button>
      </div>
    </div>

    <div class="flex-1" />

    <!-- Actions -->
    <button class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
      Export
    </button>
    <button
      class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      @click="editor.reset()"
    >
      Reset
    </button>
    <button class="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors">
      Save
    </button>
  </div>
</template>
