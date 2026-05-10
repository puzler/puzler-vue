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
  // 'list'     — add/remove instances tracked in activeConstraints (globals, future region/line)
  // 'cosmetic' — same add/remove model, but clicking an item sets activeTool
  // 'tool'     — (reserved) options always visible as tool buttons (unused for now)
  mode: 'list' | 'cosmetic'
}

const categories: Category[] = [
  {
    key: 'global',
    label: 'Global Rules',
    mode: 'list',
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
    mode: 'list',
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
    mode: 'list',
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
    mode: 'cosmetic',
    options: [
      { type: 'cosmetic_line', label: 'Line' },
      { type: 'cell_color', label: 'Cell color' },
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
  // Auto-select newly added cosmetic tools
  if (pickerCategory.value.mode === 'cosmetic') {
    editor.setActiveTool(type)
  }
}

function handleRemoveConfirm() {
  if (!confirmTarget.value) return
  if (editor.activeTool === confirmTarget.value.type) {
    editor.setActiveTool('digit')
  }
  if (confirmTarget.value.category === 'cosmetic') {
    editor.removeCosmeticType(confirmTarget.value.id, confirmTarget.value.type)
  } else {
    editor.removeConstraint(confirmTarget.value.id)
  }
  confirmId.value = null
}
</script>

<template>
  <aside class="flex flex-col bg-white overflow-y-auto">
    <!-- Puzzle metadata -->
    <div class="px-2 py-3 border-b border-gray-100">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-2">
        Puzzle
      </p>
      <div class="flex flex-col gap-1.5 px-1">
        <input
          v-model="editor.puzzleName"
          placeholder="Puzzle name"
          class="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400"
        >
        <input
          v-model="editor.puzzleAuthor"
          placeholder="Author"
          class="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400"
        >
        <textarea
          v-model="editor.puzzleRules"
          placeholder="Rules..."
          rows="3"
          class="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
    </div>

    <!-- Tool selection -->
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
        Given Digits
      </button>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'region'
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'"
        @click="editor.setActiveTool('region')"
      >
        Regions
      </button>
    </div>

    <!-- Constraint / cosmetic categories -->
    <div
      v-for="cat in categories"
      :key="cat.key"
      class="flex flex-col gap-0.5 px-2 py-3 border-b border-gray-100 last:border-b-0"
    >
      <!-- Category header with + button -->
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

      <!-- Cosmetic mode: added items are active-tool selector buttons -->
      <template v-if="cat.mode === 'cosmetic'">
        <div
          v-for="constraint in constraintsFor(cat.key)"
          :key="constraint.id"
          class="flex items-center justify-between px-3 py-1.5 rounded-md group"
          :class="editor.activeTool === constraint.type ? 'bg-blue-50' : 'hover:bg-gray-50'"
        >
          <button
            class="flex-1 text-left text-sm transition-colors"
            :class="editor.activeTool === constraint.type
              ? 'text-blue-700 font-medium'
              : 'text-gray-700'"
            @click="editor.setActiveTool(constraint.type)"
          >
            {{ constraint.label }}
          </button>
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
      </template>

      <!-- List mode: add/remove constraint instances (globals, region, line) -->
      <template v-else>
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
      </template>
    </div>
  </aside>

  <!-- Constraint picker modal -->
  <ConstraintPickerModal
    v-if="pickerCategory"
    :title="pickerCategory.label"
    :options="pickerCategory.options"
    :disabled-types="addedTypesFor(pickerCategory.key)"
    @pick="handlePick"
    @close="pickerCategory = null"
  />

  <!-- Remove confirmation modal -->
  <ConfirmModal
    v-if="confirmTarget"
    :message="`Remove '${confirmTarget.label}'?`"
    @confirm="handleRemoveConfirm"
    @cancel="confirmId = null"
  />
</template>
