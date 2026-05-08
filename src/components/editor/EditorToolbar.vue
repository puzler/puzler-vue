<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ConstraintPickerModal from './ConstraintPickerModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const editor = useEditorStore()

interface ConstraintOption {
  type: string
  label: string
}

interface Category {
  key: string
  label: string
  options: ConstraintOption[]
}

const categories: Category[] = [
  {
    key: 'global',
    label: 'Global Rules',
    options: [
      { type: 'diagonal', label: 'Diagonal' },
      { type: 'knights_move', label: "Knight's move" },
      { type: 'kings_move', label: "King's move" },
      { type: 'non_consecutive', label: 'Non-consecutive' },
    ],
  },
  {
    key: 'region',
    label: 'Regions',
    options: [
      { type: 'killer_cage', label: 'Killer cage' },
      { type: 'windoku', label: 'Windoku' },
      { type: 'irregular_region', label: 'Irregular region' },
      { type: 'clone', label: 'Clone' },
    ],
  },
  {
    key: 'line',
    label: 'Lines',
    options: [
      { type: 'thermometer', label: 'Thermometer' },
      { type: 'arrow', label: 'Arrow' },
      { type: 'renban', label: 'Renban' },
      { type: 'german_whispers', label: 'German whispers' },
      { type: 'dutch_whispers', label: 'Dutch whispers' },
      { type: 'palindrome', label: 'Palindrome' },
      { type: 'custom_line', label: 'Custom line' },
    ],
  },
  {
    key: 'cosmetic',
    label: 'Cosmetics',
    options: [
      { type: 'cell_color', label: 'Cell color' },
      { type: 'cosmetic_line', label: 'Line' },
      { type: 'shape', label: 'Shape' },
      { type: 'text', label: 'Text' },
    ],
  },
]

const pickerCategory = ref<Category | null>(null)
const confirmId = ref<string | null>(null)

const confirmTarget = computed(() =>
  editor.activeConstraints.find((c) => c.id === confirmId.value) ?? null,
)

function constraintsFor(key: string) {
  return editor.activeConstraints.filter((c) => c.category === key)
}

function addedTypesFor(key: string) {
  return constraintsFor(key).map((c) => c.type)
}

function handlePick(type: string, label: string) {
  if (!pickerCategory.value) return
  editor.addConstraint(type, label, pickerCategory.value.key)
}
</script>

<template>
  <aside class="w-48 flex flex-col border-r border-gray-200 bg-white overflow-y-auto shrink-0">
    <!-- Digit tool -->
    <div class="px-2 py-3 border-b border-gray-100">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-1">
        Tools
      </p>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'digit'
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'"
        @click="editor.setActiveTool('digit')"
      >
        Digits
      </button>
    </div>

    <!-- Constraint categories -->
    <div
      v-for="cat in categories"
      :key="cat.key"
      class="flex flex-col gap-0.5 px-2 py-3 border-b border-gray-100 last:border-b-0"
    >
      <!-- Category header -->
      <div class="flex items-center justify-between px-2 mb-1">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {{ cat.label }}
        </p>
        <button
          class="w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm leading-none"
          :title="`Add ${cat.label}`"
          @click="pickerCategory = cat"
        >
          +
        </button>
      </div>

      <!-- Added constraints -->
      <div
        v-for="constraint in constraintsFor(cat.key)"
        :key="constraint.id"
        class="flex items-center justify-between px-3 py-1.5 rounded-md group hover:bg-gray-50"
      >
        <span class="text-sm text-gray-700 truncate">{{ constraint.label }}</span>
        <button
          class="ml-1 w-4 h-4 flex items-center justify-center rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 text-xs leading-none"
          title="Remove"
          @click="confirmId = constraint.id"
        >
          ×
        </button>
      </div>

      <p
        v-if="constraintsFor(cat.key).length === 0"
        class="px-3 text-[11px] text-gray-300 italic"
      >
        None added
      </p>
    </div>
  </aside>

  <!-- Constraint picker modal -->
  <ConstraintPickerModal
    v-if="pickerCategory"
    :title="pickerCategory.label"
    :options="pickerCategory.options"
    :disabled-types="pickerCategory.key === 'global' ? addedTypesFor('global') : []"
    @pick="handlePick"
    @close="pickerCategory = null"
  />

  <!-- Remove confirmation modal -->
  <ConfirmModal
    v-if="confirmTarget"
    :message="`Remove '${confirmTarget.label}'?`"
    @confirm="editor.removeConstraint(confirmTarget!.id); confirmId = null"
    @cancel="confirmId = null"
  />
</template>
