<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { GLOBAL_VARIANTS } from '@/types/constraints'
import ConstraintPickerModal from './ConstraintPickerModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import PuzzleMetaFields from './PuzzleMetaFields.vue'
import ConstraintCategorySection from './ConstraintCategorySection.vue'

const editor = useEditorStore()

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

const categories: Category[] = [
  {
    key: 'global',
    label: 'Global Rules',
    mode: 'global',
    options: [
      { type: 'diagonals', label: 'Diagonals' },
      { type: 'chess', label: 'Chess' },
      { type: 'anti_kropki', label: 'Anti-Kropki' },
      { type: 'anti_xv', label: 'Anti-XV' },
      { type: 'disjoint_sets', label: 'Disjoint Sets' },
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
    mode: 'tool',
    options: [
      { type: 'thermometer', label: 'Thermometer' },
      { type: 'arrow', label: 'Arrow' },
      { type: 'renban', label: 'Renban' },
      { type: 'german_whispers', label: 'German whispers' },
      { type: 'dutch_whispers', label: 'Dutch whispers' },
      { type: 'palindrome', label: 'Palindrome' },
      { type: 'region_sum', label: 'Region sum' },
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

function handlePick(type: string, label: string) {
  if (!pickerCategory.value) return
  editor.addConstraint(type, label, pickerCategory.value.key)
  if (pickerCategory.value.mode !== 'list') editor.setActiveTool(type)
}

function handleRemoveConfirm() {
  if (!confirmTarget.value) return
  if (editor.activeTool === confirmTarget.value.type) editor.setActiveTool('digit')
  if (confirmTarget.value.category === 'global') {
    const variantTypes = (GLOBAL_VARIANTS[confirmTarget.value.type] ?? []).map(v => v.type)
    editor.removeGlobalConstraint(confirmTarget.value.id, variantTypes)
  } else if (confirmTarget.value.category === 'cosmetic') {
    editor.removeCosmeticType(confirmTarget.value.id, confirmTarget.value.type)
  } else if (confirmTarget.value.category === 'line') {
    editor.removeConstraintLine(confirmTarget.value.id, confirmTarget.value.type)
  } else {
    editor.removeConstraint(confirmTarget.value.id)
  }
  confirmId.value = null
}
</script>

<template>
  <aside class="flex flex-col bg-white overflow-y-auto">
    <PuzzleMetaFields />

    <div class="px-2 py-3 border-b border-gray-100">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-1">
        Tools
      </p>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'digit' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'"
        @click="editor.setActiveTool('digit')"
      >
        Given Digits
      </button>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'region' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'"
        @click="editor.setActiveTool('region')"
      >
        Regions
      </button>
    </div>

    <ConstraintCategorySection
      v-for="cat in categories"
      :key="cat.key"
      :cat="cat"
      :constraints="constraintsFor(cat.key)"
      @open-picker="pickerCategory = cat"
      @confirm-remove="confirmId = $event"
    />
  </aside>

  <ConstraintPickerModal
    v-if="pickerCategory"
    :title="pickerCategory.label"
    :options="pickerCategory.options"
    :disabled-types="constraintsFor(pickerCategory.key).map(c => c.type)"
    @pick="handlePick"
    @close="pickerCategory = null"
  />

  <ConfirmModal
    v-if="confirmTarget"
    :message="`Remove '${confirmTarget.label}'?`"
    @confirm="handleRemoveConfirm"
    @cancel="confirmId = null"
  />
</template>
