<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { GLOBAL_VARIANTS } from '@/types/constraints'
import LocalConstraintPickerModal from './LocalConstraintPickerModal.vue'
import ConstraintPickerModal from './ConstraintPickerModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import PuzzleMetaFields from './PuzzleMetaFields.vue'
import ConstraintCategorySection from './ConstraintCategorySection.vue'

// Multiple root nodes (aside + teleported modals) prevent automatic attr
// inheritance, so forward attrs to the aside explicitly
defineOptions({ inheritAttrs: false })

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

// Constraint types that activate a draw tool when clicked in the sidebar
const LOCAL_TOOL_TYPES = new Set([
  'thermometer', 'arrow', 'renban', 'german_whispers', 'dutch_whispers',
  'palindrome', 'region_sum', 'between_lines',
  'odd_cells', 'even_cells', 'minimums', 'maximums', 'row_index_cells', 'col_index_cells',
  'difference_dots', 'ratio_dots', 'xv', 'quadruples',
  'killer_cage', 'extra_regions', 'clone',
  'x_sums', 'sandwich_sums', 'skyscrapers', 'little_killers',
])

// Maps local constraint types to their storage category for correct removal routing
const LINE_CATEGORY_TYPES = new Set([
  'renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum',
  'between_lines', 'thermometer', 'arrow',
])
const REGION_CATEGORY_TYPES = new Set(['killer_cage', 'clone', 'extra_regions'])
const SINGLE_CELL_TYPES = new Set(['odd_cells', 'even_cells', 'minimums', 'maximums', 'row_index_cells', 'col_index_cells'])
const CONNECTOR_TYPES = new Set(['difference_dots', 'ratio_dots', 'xv', 'quadruples'])
const OUTER_TYPES = new Set(['x_sums', 'sandwich_sums', 'skyscrapers', 'little_killers'])

const globalCategory: Category = {
  key: 'global',
  label: 'Global Constraints',
  mode: 'global',
  options: [
    { type: 'diagonals', label: 'Diagonals' },
    { type: 'chess', label: 'Chess' },
    { type: 'anti_kropki', label: 'Anti-Kropki' },
    { type: 'anti_xv', label: 'Anti-XV' },
    { type: 'disjoint_sets', label: 'Disjoint Sets' },
  ],
}

const localCategory: Category = {
  key: 'local',
  label: 'Local Constraints',
  mode: 'list',
  options: [],
}

const cosmeticCategory: Category = {
  key: 'cosmetic',
  label: 'Cosmetics',
  mode: 'cosmetic',
  options: [
    { type: 'cosmetic_line', label: 'Line' },
    { type: 'cell_color', label: 'Cell color' },
    { type: 'shape', label: 'Shape' },
    { type: 'text', label: 'Text' },
  ],
}

const showLocalPicker = ref(false)
const pickerCategory = ref<Category | null>(null)
const confirmId = ref<string | null>(null)

const confirmTarget = computed(() =>
  editor.activeConstraints.find((c) => c.id === confirmId.value) ?? null,
)

const localConstraints = computed(() =>
  editor.activeConstraints.filter(c => c.category !== 'global' && c.category !== 'cosmetic'),
)

function constraintsFor(key: string) {
  return editor.activeConstraints.filter((c) => c.category === key)
}

function handleLocalPick(type: string, label: string) {
  let category: string
  if (LINE_CATEGORY_TYPES.has(type)) {
    category = 'line'
  } else if (REGION_CATEGORY_TYPES.has(type)) {
    category = 'region'
  } else if (SINGLE_CELL_TYPES.has(type)) {
    category = 'single_cell'
  } else if (CONNECTOR_TYPES.has(type)) {
    category = 'connector'
  } else if (OUTER_TYPES.has(type)) {
    category = 'outer'
  } else {
    category = 'local'
  }
  editor.addConstraint(type, label, category)
  if (LOCAL_TOOL_TYPES.has(type)) editor.setActiveTool(type)
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
  } else if (confirmTarget.value.category === 'single_cell') {
    editor.removeSingleCellConstraint(confirmTarget.value.id, confirmTarget.value.type)
  } else if (confirmTarget.value.category === 'connector') {
    editor.removeConnectorConstraint(confirmTarget.value.id, confirmTarget.value.type)
  } else if (confirmTarget.value.category === 'region') {
    editor.removeRegionConstraint(confirmTarget.value.id, confirmTarget.value.type)
  } else if (confirmTarget.value.category === 'outer') {
    editor.removeOuterClueConstraint(confirmTarget.value.id, confirmTarget.value.type)
  } else {
    editor.removeConstraint(confirmTarget.value.id)
  }
  confirmId.value = null
}
</script>

<template>
  <aside
    class="flex flex-col flex-1 min-h-0 bg-paper overflow-y-auto border-r border-line"
    v-bind="$attrs"
  >
    <PuzzleMetaFields />

    <div class="px-2 py-3 border-b border-line">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft px-2 mb-1">
        Tools
      </p>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'digit' ? 'bg-action-tint text-action font-medium' : 'text-ink-text hover:bg-line/60'"
        @click="editor.setActiveTool('digit')"
      >
        Given Digits
      </button>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'region' ? 'bg-action-tint text-action font-medium' : 'text-ink-text hover:bg-line/60'"
        @click="editor.setActiveTool('region')"
      >
        Regions
      </button>
    </div>

    <ConstraintCategorySection
      :cat="globalCategory"
      :constraints="constraintsFor('global')"
      @open-picker="pickerCategory = globalCategory"
      @confirm-remove="confirmId = $event"
    />

    <ConstraintCategorySection
      :cat="localCategory"
      :constraints="localConstraints"
      :tool-types="LOCAL_TOOL_TYPES"
      @open-picker="showLocalPicker = true"
      @confirm-remove="confirmId = $event"
    />

    <ConstraintCategorySection
      :cat="cosmeticCategory"
      :constraints="constraintsFor('cosmetic')"
      @open-picker="pickerCategory = cosmeticCategory"
      @confirm-remove="confirmId = $event"
    />
  </aside>

  <LocalConstraintPickerModal
    v-if="showLocalPicker"
    :disabled-types="localConstraints.map(c => c.type)"
    @pick="handleLocalPick"
    @close="showLocalPicker = false"
  />

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
