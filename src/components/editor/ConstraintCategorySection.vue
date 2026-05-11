<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

interface ConstraintOption {
  type: string
  label: string
}

interface Category {
  key: string
  label: string
  options: ConstraintOption[]
  mode: 'global' | 'list' | 'cosmetic' | 'tool'
}

interface Constraint {
  id: string
  type: string
  label: string
  category: string
}

const props = defineProps<{
  cat: Category
  constraints: Constraint[]
}>()

const emit = defineEmits<{
  'open-picker': []
  'confirm-remove': [id: string]
}>()

const editor = useEditorStore()

const isClickable = props.cat.mode === 'global' || props.cat.mode === 'cosmetic' || props.cat.mode === 'tool'
</script>

<template>
  <div class="flex flex-col gap-0.5 px-2 py-3 border-b border-gray-100 last:border-b-0">
    <div class="flex items-center justify-between px-2 mb-1">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {{ cat.label }}
      </p>
      <button
        class="w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm leading-none"
        :title="`Add ${cat.label}`"
        @click="emit('open-picker')"
      >
        +
      </button>
    </div>

    <template v-if="isClickable">
      <div
        v-for="constraint in constraints"
        :key="constraint.id"
        class="flex items-center justify-between px-3 py-1.5 rounded-md group"
        :class="editor.activeTool === constraint.type ? 'bg-blue-50' : 'hover:bg-gray-50'"
      >
        <button
          class="flex-1 text-left text-sm transition-colors"
          :class="editor.activeTool === constraint.type ? 'text-blue-700 font-medium' : 'text-gray-700'"
          @click="editor.setActiveTool(constraint.type)"
        >
          {{ constraint.label }}
        </button>
        <button
          class="ml-1 w-4 h-4 flex items-center justify-center rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 text-xs leading-none"
          title="Remove"
          @click="emit('confirm-remove', constraint.id)"
        >
          ×
        </button>
      </div>
    </template>

    <template v-else>
      <div
        v-for="constraint in constraints"
        :key="constraint.id"
        class="flex items-center justify-between px-3 py-1.5 rounded-md group hover:bg-gray-50"
      >
        <span class="text-sm text-gray-700 truncate">{{ constraint.label }}</span>
        <button
          class="ml-1 w-4 h-4 flex items-center justify-center rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 text-xs leading-none"
          title="Remove"
          @click="emit('confirm-remove', constraint.id)"
        >
          ×
        </button>
      </div>
    </template>

    <p
      v-if="constraints.length === 0"
      class="px-3 text-[11px] text-gray-300 italic"
    >
      None added
    </p>
  </div>
</template>
