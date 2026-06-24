<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import MdiIcon from '@/components/MdiIcon.vue'
import { CONSTRAINT_ICONS } from '@/types/constraintIcons'
import { useConstraintStyles } from '@/composables/useConstraintStyles'

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
  toolTypes?: Set<string>
}>()

const emit = defineEmits<{
  'open-picker': []
  'confirm-remove': [id: string]
}>()

const editor = useEditorStore()
const cs = useConstraintStyles()

function isClickable(type: string): boolean {
  if (props.toolTypes !== undefined) return props.toolTypes.has(type)
  return props.cat.mode === 'global' || props.cat.mode === 'cosmetic' || props.cat.mode === 'tool'
}
</script>

<template>
  <div class="flex flex-col gap-0.5 px-2 py-3 border-b border-line last:border-b-0">
    <div class="flex items-center justify-between px-2 mb-1">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        {{ cat.label }}
      </p>
      <button
        class="w-4 h-4 flex items-center justify-center rounded text-soft hover:text-action hover:bg-action-tint transition-colors text-sm leading-none"
        :title="`Add ${cat.label}`"
        @click="emit('open-picker')"
      >
        +
      </button>
    </div>

    <div
      v-for="constraint in constraints"
      :key="constraint.id"
      class="flex items-center justify-between px-3 py-1.5 rounded-md group hover:bg-line/60"
      :class="{ 'bg-action-tint hover:bg-action-tint': isClickable(constraint.type) && editor.activeTool === constraint.type }"
    >
      <button
        v-if="isClickable(constraint.type)"
        class="flex items-center gap-2 flex-1 text-left text-sm transition-colors min-w-0"
        :class="editor.activeTool === constraint.type ? 'text-action font-medium' : 'text-ink-text'"
        @click="editor.setActiveTool(constraint.type)"
      >
        <MdiIcon
          v-if="CONSTRAINT_ICONS[constraint.type]"
          :path="CONSTRAINT_ICONS[constraint.type].path"
          :color="cs.iconColor(constraint.type) ?? (editor.activeTool === constraint.type ? 'rgb(79 70 229)' : undefined)"
          :rotate="CONSTRAINT_ICONS[constraint.type].rotate"
          :size="15"
          class="shrink-0"
        />
        {{ constraint.label }}
      </button>
      <span
        v-else
        class="flex items-center gap-2 flex-1 text-sm text-ink-text min-w-0"
      >
        <MdiIcon
          v-if="CONSTRAINT_ICONS[constraint.type]"
          :path="CONSTRAINT_ICONS[constraint.type].path"
          :color="cs.iconColor(constraint.type)"
          :rotate="CONSTRAINT_ICONS[constraint.type].rotate"
          :size="15"
          class="shrink-0"
        />
        <span class="truncate">{{ constraint.label }}</span>
      </span>
      <button
        class="ml-1 w-4 h-4 flex items-center justify-center rounded text-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 text-xs leading-none"
        title="Remove"
        @click="emit('confirm-remove', constraint.id)"
      >
        ×
      </button>
    </div>

    <p
      v-if="constraints.length === 0"
      class="px-3 text-[11px] text-faint italic"
    >
      None added
    </p>
  </div>
</template>
